import { signal as createSignal, type ReadonlySignal } from './signal.js';
import { createResponse } from './response.js';
import { normalizeBackpressure, createDeferred } from './stream-backpressure.js';
import { AsyncQueue } from './stream-queue.js';
import { startSource } from './stream-source.js';
import { createReadableSignal, reduceText } from './stream-state.js';
import type {
  Deferred,
  QoreStream,
  StreamController,
  StreamInput,
  StreamOptions,
  StreamResponseState
} from './stream-types.js';
import { sleep } from '../shared/utils.js';

interface BufferedWrite<TChunk, TValue> extends Deferred<TValue> {
  chunk: TChunk;
}

type MutableStream<TChunk, TValue> = QoreStream<TChunk, TValue> & {
  signal?: AbortSignal | null;
  [Symbol.asyncIterator](): AsyncIterableIterator<TChunk>;
};

// Create the core stream primitive: a read-only signal plus async iterable plus lifecycle state.
export function createStream<TChunk, TValue = string>(
  sourceOrSetup: StreamInput<TChunk, TValue>,
  options: StreamOptions<TChunk, TValue> = {}
): QoreStream<TChunk, TValue> {
  const {
    seed = '' as TValue,
    reduce = reduceText as unknown as (currentValue: TValue, chunk: TChunk, index: number) => TValue,
    backpressure = null
  } = options;
  const pressure = normalizeBackpressure(backpressure);

  const state = createResponse<TChunk, TValue>({ seed, reduce });
  const queue = new AsyncQueue<TChunk>();
  const readable = createReadableSignal(state.value) as MutableStream<TChunk, TValue>;
  const buffered = createSignal(0);
  const dropped = createSignal(0);

  let activeSignal: AbortSignal | null = null;
  let terminated = false;
  let flushActiveWrites: () => TValue = () => readable.peek();

  // Close queue delivery and flush any buffered chunks before the final lifecycle transition.
  const stopStream = (finalizer: () => TValue, cleanup: (() => TValue | void) = flushActiveWrites): TValue => {
    if (terminated) {
      return readable.peek();
    }

    terminated = true;
    cleanup?.();
    queue.close();
    return finalizer();
  };

  const run = state.run(async ({ signal: runtimeSignal, push, complete, fail, abort }) => {
    activeSignal = runtimeSignal;
    const pendingWrites: BufferedWrite<TChunk, TValue>[] = [];
    const spaceWaiters: Deferred<void>[] = [];
    const scheduledPushes = new Set<Promise<TValue>>();
    let scheduledPushError: unknown = null;
    let drainPromise: Promise<void> | null = null;
    let lastPushAt = 0;

    // Wake producers waiting on queue space once the buffer has room again.
    function releaseSpaceWaiters(): void {
      if (pressure.buffer === Infinity) {
        while (spaceWaiters.length > 0) {
          spaceWaiters.shift()?.resolve(undefined);
        }

        return;
      }

      while (spaceWaiters.length > 0 && pendingWrites.length < pressure.buffer) {
        spaceWaiters.shift()?.resolve(undefined);
      }
    }

    // Resolve buffered writes when the stream finishes so late chunks do not leak through.
    function flushBufferedWrites(result: TValue = readable.peek()): TValue {
      while (pendingWrites.length > 0) {
        pendingWrites.shift()?.resolve(result);
      }

      buffered(0);
      releaseSpaceWaiters();
      return result;
    }

    flushActiveWrites = flushBufferedWrites;

    // Allow setup functions that ignore await push(...) to still drain in order before completion.
    async function flushScheduledPushes(): Promise<void> {
      while (scheduledPushes.size > 0) {
        await Promise.allSettled(Array.from(scheduledPushes));
      }

      if (scheduledPushError !== null) {
        throw scheduledPushError;
      }

      while (drainPromise) {
        await drainPromise;
      }

      if (scheduledPushError !== null) {
        throw scheduledPushError;
      }
    }

    // Maintain a minimum delay between chunks entering signal/UI state.
    async function waitForNextWindow(): Promise<void> {
      if (pressure.interval <= 0 || lastPushAt === 0) {
        return;
      }

      const remaining = pressure.interval - (Date.now() - lastPushAt);

      if (remaining > 0) {
        try {
          await sleep(remaining, runtimeSignal);
        } catch (error) {
          if (!runtimeSignal.aborted) {
            throw error;
          }
        }
      }
    }

    // Serialize writes so buffered or unawaited producers still update the UI one chunk at a time.
    function scheduleDrain(): Promise<void> | null {
      if (drainPromise || terminated) {
        return drainPromise;
      }

      drainPromise = (async () => {
        try {
          while (pendingWrites.length > 0 && !terminated && !runtimeSignal.aborted) {
            const entry = pendingWrites.shift() as BufferedWrite<TChunk, TValue>;
            buffered(pendingWrites.length);
            releaseSpaceWaiters();

            await waitForNextWindow();

            if (terminated || runtimeSignal.aborted) {
              entry.resolve(readable.peek());
              continue;
            }

            queue.push(entry.chunk);
            const nextValue = push(entry.chunk);
            lastPushAt = Date.now();
            entry.resolve(nextValue);
          }
        } finally {
          drainPromise = null;

          if (pendingWrites.length > 0 && !terminated && !runtimeSignal.aborted) {
            scheduleDrain();
          }
        }
      })();

      return drainPromise;
    }

    // Wait until buffered chunks can fit into the configured queue capacity.
    async function waitForBufferSpace(): Promise<boolean> {
      if (pressure.buffer === Infinity) {
        return true;
      }

      while (!terminated && !runtimeSignal.aborted && pendingWrites.length >= pressure.buffer) {
        const gate = createDeferred<void>();
        spaceWaiters.push(gate);
        await gate.promise;
      }

      return !terminated && !runtimeSignal.aborted;
    }

    // Wrap the response lifecycle so streams can push, fail, or abort through one surface.
    const controller: StreamController<TChunk, TValue> = {
      get signal() {
        return runtimeSignal;
      },

      // Queue chunks first, then let the serialized drain loop move them into state/UI.
      async push(chunk: TChunk): Promise<TValue> {
        if (terminated || runtimeSignal.aborted) {
          return readable.peek();
        }

        const writeTask = (async () => {
          if (pressure.overflow === 'wait') {
            const hasSpace = await waitForBufferSpace();

            if (!hasSpace) {
              return readable.peek();
            }
          } else if (pressure.buffer !== Infinity && pendingWrites.length >= pressure.buffer) {
            if (pressure.overflow === 'drop-oldest' && pendingWrites.length > 0) {
              const droppedWrite = pendingWrites.shift() as BufferedWrite<TChunk, TValue>;
              dropped(dropped.peek() + 1);
              droppedWrite.resolve(readable.peek());
            } else if (pressure.overflow === 'drop-newest' || pressure.overflow === 'drop-oldest') {
              dropped(dropped.peek() + 1);
              return readable.peek();
            } else if (pressure.overflow === 'error') {
              const overflowError = new Error('Qore stream backpressure buffer overflow');
              if (scheduledPushError === null) {
                scheduledPushError = overflowError;
              }
              controller.fail(overflowError);
              return readable.peek();
            }
          }

          if (terminated || runtimeSignal.aborted) {
            return readable.peek();
          }

          const entry = createDeferred<TValue>() as BufferedWrite<TChunk, TValue>;
          entry.chunk = chunk;
          pendingWrites.push(entry);
          buffered(pendingWrites.length);
          scheduleDrain();
          return entry.promise;
        })();

        scheduledPushes.add(writeTask);

        try {
          return await writeTask;
        } catch (error) {
          if (scheduledPushError === null) {
            scheduledPushError = error;
          }

          if (!terminated && !runtimeSignal.aborted) {
            controller.fail(error);
          }

          return readable.peek();
        } finally {
          scheduledPushes.delete(writeTask);
        }
      },

      // Mark the stream as gracefully finished.
      done(): TValue {
        return stopStream(() => complete());
      },

      // Surface producer failures to both async consumers and signal readers.
      fail(error: unknown): Error | TValue {
        if (terminated) {
          return state.error.peek();
        }

        terminated = true;
        flushBufferedWrites();
        queue.fail(error);
        return fail(error);
      },

      // Abort the stream and preserve the partial value already accumulated.
      abort(reason: unknown = 'Stream aborted'): TValue {
        return stopStream(() => abort(reason));
      }
    };

    try {
      await startSource(sourceOrSetup, controller);
      await flushScheduledPushes();

      if (!terminated && runtimeSignal.aborted) {
        controller.abort(runtimeSignal.reason ?? 'Stream aborted');
        return readable.peek();
      }

      if (!terminated) {
        controller.done();
      }

      return readable.peek();
    } catch (error) {
      const terminalStatus = state.status.peek();

      if (runtimeSignal.aborted || terminalStatus === 'aborted') {
        return readable.peek();
      }

      if (terminated && terminalStatus !== 'error') {
        return readable.peek();
      }

      throw error;
    }
  });

  // Keep async consumers in sync with failures that surface after startup.
  run.catch((error: unknown) => {
    if (!queue.closed) {
      queue.fail(error);
    }
  });

  attachStreamState(readable, state, buffered, dropped, run, stopStream);

  // Expose the current AbortSignal so advanced integrations can observe cancellation.
  Object.defineProperty(readable, 'signal', {
    enumerable: true,
    get() {
      return activeSignal;
    }
  });

  // Preserve async iteration so streams can still compose with for-await and adapters.
  readable[Symbol.asyncIterator] = async function*() {
    try {
      for await (const chunk of queue) {
        yield chunk;
      }
    } finally {
      if (!terminated && !state.aborted()) {
        readable.abort('Stream consumer disposed');
      }
    }
  };

  return readable;
}

function attachStreamState<TChunk, TValue>(
  readable: MutableStream<TChunk, TValue>,
  state: StreamResponseState<TChunk, TValue>,
  buffered: ReadonlySignal<number>,
  dropped: ReadonlySignal<number>,
  run: Promise<TValue>,
  stopStream: (finalizer: () => TValue, cleanup?: (() => TValue | void)) => TValue
): void {
  readable.status = state.status;
  readable.error = state.error;
  readable.chunks = state.chunks;
  readable.startedAt = state.startedAt;
  readable.finishedAt = state.finishedAt;
  readable.pending = state.pending;
  readable.streaming = state.streaming;
  readable.completed = state.completed;
  readable.failed = state.failed;
  readable.aborted = state.aborted;
  readable.chunkCount = state.chunkCount;
  readable.snapshot = state.snapshot;
  readable.buffered = createReadableSignal(buffered);
  readable.dropped = createReadableSignal(dropped);
  readable.ready = run;
  readable.abort = (reason?: unknown) => stopStream(() => state.abort(reason));
}
