import { signal as createSignal, type ReadonlySignal } from './signal.js';
import { createResponse } from './response.js';
import { normalizeBackpressure } from './stream-backpressure.js';
import { createStreamBuffer } from './stream-buffer.js';
import { attachStreamIterator } from './stream-iterator.js';
import { createStreamLifecycle } from './stream-lifecycle.js';
import { AsyncQueue } from './stream-queue.js';
import { startSource } from './stream-source.js';
import { createReadableArraySignal, createReadableSignal, reduceText } from './stream-state.js';
import type {
  QoreStream,
  StreamController,
  StreamInput,
  StreamOptions,
  StreamResponseState
} from './stream-types.js';
import { normalizeError } from '../shared/utils.js';
import { createDevtoolsStreamId, emitQoreDevtoolsEvent } from './devtools.js';

type MutableStream<TChunk, TValue> = QoreStream<TChunk, TValue> & {
  signal?: AbortSignal | null;
  [Symbol.asyncIterator](): AsyncIterableIterator<TChunk>;
};

function createDevtoolsBase(id: string, name: string | undefined): { id: string; name?: string } {
  return name === undefined ? { id } : { id, name };
}

// Create the core stream primitive: a read-only signal plus async iterable plus lifecycle state.
export function createStream<TChunk, TValue = string>(
  sourceOrSetup: StreamInput<TChunk, TValue>,
  options: StreamOptions<TChunk, TValue> = {}
): QoreStream<TChunk, TValue> {
  const {
    name,
    seed = '' as TValue,
    reduce = reduceText as unknown as (currentValue: TValue, chunk: TChunk, index: number) => TValue,
    backpressure = null
  } = options;
  const pressure = normalizeBackpressure(backpressure);
  const streamId = createDevtoolsStreamId();

  const state = createResponse<TChunk, TValue>({ seed, reduce });
  const queue = new AsyncQueue<TChunk>();
  const readable = createReadableSignal(state.value) as MutableStream<TChunk, TValue>;
  const buffered = createSignal(0);
  const dropped = createSignal(0);
  emitQoreDevtoolsEvent({
    kind: 'stream',
    phase: 'create',
    ...createDevtoolsBase(streamId, name),
    status: 'idle',
    chunkCount: 0,
    value: seed,
    timestamp: Date.now()
  });

  const lifecycle = createStreamLifecycle({
    closeQueue: () => queue.close(),
    readCurrent: () => readable.peek()
  });

  let activeSignal: AbortSignal | null = null;

  const run = state.run(async ({ signal: runtimeSignal, push, complete, fail, abort }) => {
    activeSignal = runtimeSignal;

    function failStream(error: unknown): Error | TValue {
      if (lifecycle.isTerminated()) {
        return state.error.peek() ?? normalizeError(error);
      }

      lifecycle.markTerminated();
      buffer.flush();
      queue.fail(error);
      return fail(error);
    }

    const buffer = createStreamBuffer<TChunk, TValue>({
      enqueueChunk: (chunk) => queue.push(chunk),
      fail: failStream,
      isTerminated: lifecycle.isTerminated,
      pressure,
      readCurrent: () => readable.peek(),
      recordDrop: () => dropped(dropped.peek() + 1),
      signal: runtimeSignal,
      updateBuffered: (count) => buffered(count),
      writeChunk: (chunk) => {
        const nextValue = push(chunk);
        emitQoreDevtoolsEvent({
          kind: 'stream',
          phase: 'chunk',
          ...createDevtoolsBase(streamId, name),
          status: state.status.peek(),
          chunk,
          value: nextValue,
          chunkCount: state.chunkCount.peek(),
          timestamp: Date.now()
        });
        return nextValue;
      }
    });

    lifecycle.setCleanup(buffer.flush);

    // Wrap the response lifecycle so streams can push, fail, or abort through one surface.
    const controller: StreamController<TChunk, TValue> = {
      get signal() {
        return runtimeSignal;
      },

      // Queue chunks first, then let the serialized drain loop move them into state/UI.
      async push(chunk: TChunk): Promise<TValue> {
        return buffer.push(chunk);
      },

      // Mark the stream as gracefully finished.
      done(): TValue {
        return lifecycle.stop(() => complete());
      },

      // Surface producer failures to both async consumers and signal readers.
      fail(error: unknown): Error | TValue {
        return failStream(error);
      },

      // Abort the stream and preserve the partial value already accumulated.
      abort(reason: unknown = 'Stream aborted'): TValue {
        return lifecycle.stop(() => abort(reason));
      }
    };

    try {
      await startSource(sourceOrSetup, controller);
      await buffer.flushScheduled();

      if (!lifecycle.isTerminated() && runtimeSignal.aborted) {
        controller.abort(runtimeSignal.reason ?? 'Stream aborted');
        return readable.peek();
      }

      if (!lifecycle.isTerminated()) {
        controller.done();
      }

      return readable.peek();
    } catch (error) {
      const terminalStatus = state.status.peek();

      if (runtimeSignal.aborted || terminalStatus === 'aborted') {
        return readable.peek();
      }

      if (lifecycle.isTerminated() && terminalStatus !== 'error') {
        return readable.peek();
      }

      throw error;
    }
  });

  const unsubscribeStatusDevtools = state.status.subscribe((status) => {
    const phase = status === 'completed'
      ? 'complete'
      : status === 'error'
        ? 'error'
        : status === 'aborted'
          ? 'abort'
          : 'status';

    emitQoreDevtoolsEvent({
      kind: 'stream',
      phase,
      ...createDevtoolsBase(streamId, name),
      status,
      value: state.value.peek(),
      chunkCount: state.chunkCount.peek(),
      error: state.error.peek(),
      timestamp: Date.now()
    });
  }, { immediate: false });

  run.finally(unsubscribeStatusDevtools).catch(() => {
    // The original ready promise still carries the stream failure; this branch only prevents
    // instrumentation cleanup from creating an unhandled rejection.
  });

  // Keep async consumers in sync with failures that surface after startup.
  run.catch((error: unknown) => {
    if (!queue.closed) {
      queue.fail(error);
    }
  });

  Object.defineProperties(readable, {
    id: {
      enumerable: true,
      value: streamId
    },
    name: {
      enumerable: true,
      value: name
    }
  });

  attachStreamState(readable, state, buffered, dropped, run, lifecycle.stop);

  // Expose the current AbortSignal so advanced integrations can observe cancellation.
  Object.defineProperty(readable, 'signal', {
    enumerable: true,
    get() {
      return activeSignal;
    }
  });

  attachStreamIterator(
    readable,
    queue,
    () => !lifecycle.isTerminated() && !state.aborted(),
    (reason) => readable.abort(reason)
  );

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
  readable.status = createReadableSignal(state.status);
  readable.error = createReadableSignal(state.error);
  readable.chunks = createReadableArraySignal(state.chunks);
  readable.startedAt = createReadableSignal(state.startedAt);
  readable.finishedAt = createReadableSignal(state.finishedAt);
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
