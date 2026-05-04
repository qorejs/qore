// @ts-nocheck
import { signal } from './signal.js';
import { createResponse } from './response.js';
import { normalizeBackpressure, createDeferred } from './stream-backpressure.js';
import { AsyncQueue } from './stream-queue.js';
import { startSource } from './stream-source.js';
import { createReadableSignal, reduceText } from './stream-state.js';
import { sleep } from '../shared/utils.js';

// Create the core stream primitive: a read-only signal plus async iterable plus lifecycle state.
export function createStream(sourceOrSetup, options = {}) {
  const {
    seed = '',
    reduce = reduceText,
    backpressure = null
  } = options;
  const pressure = normalizeBackpressure(backpressure);

  const state = createResponse({ seed, reduce });
  const queue = new AsyncQueue();
  const readable = createReadableSignal(state.value);
  const buffered = signal(0);
  const dropped = signal(0);

  let activeSignal = null;
  let terminated = false;
  let flushActiveWrites = () => readable.peek();

  // Close queue delivery and flush any buffered chunks before the final lifecycle transition.
  const stopStream = (finalizer, cleanup = flushActiveWrites) => {
    if (terminated) {
      return readable.peek();
    }

    terminated = true;
    cleanup?.();
    queue.close();
    return finalizer();
  };

  const run = state.run(async ({ signal, push, complete, fail, abort }) => {
    activeSignal = signal;
    const pendingWrites = [];
    const spaceWaiters = [];
    const scheduledPushes = new Set();
    let drainPromise = null;
    let lastPushAt = 0;

    // Wake producers waiting on queue space once the buffer has room again.
    function releaseSpaceWaiters() {
      if (pressure.buffer === Infinity) {
        while (spaceWaiters.length > 0) {
          spaceWaiters.shift().resolve();
        }

        return;
      }

      while (spaceWaiters.length > 0 && pendingWrites.length < pressure.buffer) {
        spaceWaiters.shift().resolve();
      }
    }

    // Resolve buffered writes when the stream finishes so late chunks do not leak through.
    function flushBufferedWrites(result = readable.peek()) {
      while (pendingWrites.length > 0) {
        pendingWrites.shift().resolve(result);
      }

      buffered(0);
      releaseSpaceWaiters();
      return result;
    }

    flushActiveWrites = flushBufferedWrites;

    // Allow setup functions that ignore await push(...) to still drain in order before completion.
    async function flushScheduledPushes() {
      while (scheduledPushes.size > 0) {
        await Promise.all(Array.from(scheduledPushes));
      }

      while (drainPromise) {
        await drainPromise;
      }
    }

    // Maintain a minimum delay between chunks entering signal/UI state.
    async function waitForNextWindow() {
      if (pressure.interval <= 0 || lastPushAt === 0) {
        return;
      }

      const remaining = pressure.interval - (Date.now() - lastPushAt);

      if (remaining > 0) {
        try {
          await sleep(remaining, signal);
        } catch (error) {
          if (!signal.aborted) {
            throw error;
          }
        }
      }
    }

    // Serialize writes so buffered or unawaited producers still update the UI one chunk at a time.
    function scheduleDrain() {
      if (drainPromise || terminated) {
        return drainPromise;
      }

      drainPromise = (async () => {
        try {
          while (pendingWrites.length > 0 && !terminated && !signal.aborted) {
            const entry = pendingWrites.shift();
            buffered(pendingWrites.length);
            releaseSpaceWaiters();

            await waitForNextWindow();

            if (terminated || signal.aborted) {
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

          if (pendingWrites.length > 0 && !terminated && !signal.aborted) {
            scheduleDrain();
          }
        }
      })();

      return drainPromise;
    }

    // Wait until buffered chunks can fit into the configured queue capacity.
    async function waitForBufferSpace() {
      if (pressure.buffer === Infinity) {
        return true;
      }

      while (!terminated && !signal.aborted && pendingWrites.length >= pressure.buffer) {
        const gate = createDeferred();
        spaceWaiters.push(gate);
        await gate.promise;
      }

      return !terminated && !signal.aborted;
    }

    // Wrap the response lifecycle so streams can push, fail, or abort through one surface.
    const controller = {
      get signal() {
        return signal;
      },

      // Queue chunks first, then let the serialized drain loop move them into state/UI.
      async push(chunk) {
        if (terminated || signal.aborted) {
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
              const droppedWrite = pendingWrites.shift();
              dropped(dropped.peek() + 1);
              droppedWrite.resolve(readable.peek());
            } else if (pressure.overflow === 'drop-newest' || pressure.overflow === 'drop-oldest') {
              dropped(dropped.peek() + 1);
              return readable.peek();
            } else if (pressure.overflow === 'error') {
              controller.fail(new Error('Qore stream backpressure buffer overflow'));
              return readable.peek();
            }
          }

          if (terminated || signal.aborted) {
            return readable.peek();
          }

          const entry = createDeferred();
          entry.chunk = chunk;
          pendingWrites.push(entry);
          buffered(pendingWrites.length);
          scheduleDrain();
          return entry.promise;
        })();

        scheduledPushes.add(writeTask);

        try {
          return await writeTask;
        } finally {
          scheduledPushes.delete(writeTask);
        }
      },

      // Mark the stream as gracefully finished.
      done() {
        return stopStream(() => complete());
      },

      // Surface producer failures to both async consumers and signal readers.
      fail(error) {
        if (terminated) {
          return state.error.peek();
        }

        terminated = true;
        flushBufferedWrites();
        queue.fail(error);
        return fail(error);
      },

      // Abort the stream and preserve the partial value already accumulated.
      abort(reason = 'Stream aborted') {
        return stopStream(() => abort(reason));
      }
    };

    try {
      await startSource(sourceOrSetup, controller);
      await flushScheduledPushes();

      if (!terminated && signal.aborted) {
        controller.abort(signal.reason ?? 'Stream aborted');
        return readable.peek();
      }

      if (!terminated) {
        controller.done();
      }

      return readable.peek();
    } catch (error) {
      if (terminated || signal.aborted) {
        return readable.peek();
      }

      throw error;
    }
  });

  // Keep async consumers in sync with failures that surface after startup.
  run.catch((error) => {
    if (!queue.closed) {
      queue.fail(error);
    }
  });

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
  readable.abort = (reason) => stopStream(() => state.abort(reason));

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
