// @ts-nocheck
import { createResponse } from './response.js';
import { signal } from './signal.js';
import { toAsyncIterable } from './iterable.js';
import { normalizeError, sleep } from '../shared/utils.js';

// Bridge producer pushes and async iteration with a minimal internal queue.
class AsyncQueue {
  constructor() {
    this.values = [];
    this.waiters = [];
    this.closed = false;
    this.error = null;
  }

  push(value) {
    if (this.closed) {
      return;
    }

    const waiter = this.waiters.shift();

    if (waiter) {
      waiter.resolve({ value, done: false });
      return;
    }

    this.values.push(value);
  }

  close() {
    if (this.closed) {
      return;
    }

    this.closed = true;

    while (this.waiters.length > 0) {
      const waiter = this.waiters.shift();
      waiter.resolve({ value: undefined, done: true });
    }
  }

  fail(error) {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.error = normalizeError(error);

    while (this.waiters.length > 0) {
      const waiter = this.waiters.shift();
      waiter.reject(this.error);
    }
  }

  next() {
    if (this.values.length > 0) {
      return Promise.resolve({ value: this.values.shift(), done: false });
    }

    if (this.closed) {
      if (this.error) {
        return Promise.reject(this.error);
      }

      return Promise.resolve({ value: undefined, done: true });
    }

    return new Promise((resolve, reject) => {
      this.waiters.push({ resolve, reject });
    });
  }

  return() {
    this.close();
    return Promise.resolve({ value: undefined, done: true });
  }

  [Symbol.asyncIterator]() {
    return this;
  }
}

// Expose a response value as a read-only signal surface.
function createReadableSignal(sourceSignal) {
  const read = () => sourceSignal();

  read.peek = () => sourceSignal.peek();
  read.subscribe = (listener, options) => sourceSignal.subscribe(listener, options);

  return read;
}

// Text streams concatenate chunks by default so they can drive text nodes directly.
function reduceText(currentValue, chunk) {
  return currentValue + String(chunk ?? '');
}

// Normalize backpressure into one consistent shape the runtime can enforce.
function normalizeBackpressure(backpressure) {
  if (backpressure == null) {
    return {
      interval: 0,
      buffer: Infinity,
      overflow: 'wait'
    };
  }

  const options = typeof backpressure === 'number'
    ? { interval: backpressure }
    : backpressure;
  const interval = options.interval ?? 0;
  const buffer = options.buffer ?? Infinity;
  const overflow = options.overflow ?? 'wait';

  if (!Number.isFinite(interval) || interval < 0) {
    throw new TypeError('Qore stream backpressure.interval must be a non-negative finite number');
  }

  if (buffer !== Infinity && (!Number.isInteger(buffer) || buffer < 1)) {
    throw new TypeError('Qore stream backpressure.buffer must be a positive integer or Infinity');
  }

  if (!['wait', 'drop-oldest', 'drop-newest', 'error'].includes(overflow)) {
    throw new TypeError(
      'Qore stream backpressure.overflow must be one of "wait", "drop-oldest", "drop-newest", or "error"'
    );
  }

  return { interval, buffer, overflow };
}

// Build a deferred promise so queue operations can wait for capacity or completion.
function createDeferred() {
  let resolve = null;
  let reject = null;
  const promise = new Promise((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

// Distinguish a setup callback from callable stream or signal-like values.
function isSetupFunction(sourceOrSetup) {
  return typeof sourceOrSetup === 'function'
    && typeof sourceOrSetup[Symbol.asyncIterator] !== 'function'
    && typeof sourceOrSetup.peek !== 'function';
}

// Pipe any async iterable-like source into the controller, honoring aborts and pacing.
async function pipeSource(source, controller) {
  for await (const chunk of toAsyncIterable(source)) {
    if (controller.signal.aborted) {
      break;
    }

    await controller.push(chunk);
  }
}

// Accept either a setup callback or a pre-existing iterable source.
async function startSource(sourceOrSetup, controller) {
  if (isSetupFunction(sourceOrSetup)) {
    const maybeSource = await sourceOrSetup(controller);

    if (maybeSource !== undefined) {
      await pipeSource(maybeSource, controller);
    }

    return;
  }

  await pipeSource(sourceOrSetup, controller);
}

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

// Create a text-accumulating stream by default.
export function stream(sourceOrSetup, options = {}) {
  return createStream(sourceOrSetup, {
    seed: '',
    reduce: reduceText,
    ...options
  });
}

// Alias the generic constructor for advanced callers that provide custom reducers.
stream.create = createStream;

// Convenience constructor for explicit text streams.
stream.text = (sourceOrSetup, options = {}) => createStream(sourceOrSetup, {
  seed: '',
  reduce: reduceText,
  ...options
});

// Convenience constructor for streams that accumulate every chunk into an array.
stream.list = (sourceOrSetup, options = {}) => createStream(sourceOrSetup, {
  seed: [],
  reduce: (currentValue, chunk) => [...currentValue, chunk],
  ...options
});

// Convenience constructor for streams that only expose the latest chunk as current value.
stream.latest = (sourceOrSetup, options = {}) => createStream(sourceOrSetup, {
  seed: null,
  reduce: (_, chunk) => chunk,
  ...options
});

// Attach backpressure behavior without changing the reducer semantics.
stream.withBackpressure = (sourceOrSetup, backpressure, options = {}) => createStream(sourceOrSetup, {
  ...options,
  backpressure: typeof options.backpressure === 'object' && typeof backpressure === 'object'
    ? { ...options.backpressure, ...backpressure }
    : backpressure
});

// Shorthand for the first backpressure primitive: minimum interval between chunks.
stream.paced = (sourceOrSetup, interval, options = {}) => stream.withBackpressure(
  sourceOrSetup,
  { interval },
  options
);

// Turn any iterable or async iterable into a stream, optionally adding source delay.
export function from(source, options = {}) {
  const { delay = 0, ...streamOptions } = options;

  return createStream(async (controller) => {
    for await (const chunk of toAsyncIterable(source)) {
      if (controller.signal.aborted) {
        break;
      }

      if (delay > 0) {
        await sleep(delay, controller.signal);
      }

      await controller.push(chunk);
    }
  }, streamOptions);
}

// Map source chunks into a new stream while preserving stream semantics.
export function mapStream(source, mapper, options = {}) {
  return createStream(async (controller) => {
    let index = 0;

    for await (const chunk of toAsyncIterable(source)) {
      if (controller.signal.aborted) {
        break;
      }

      await controller.push(await mapper(chunk, index));
      index += 1;
    }
  }, options);
}

// Emit a running reduction so each chunk sees the accumulated state so far.
export function scanStream(source, reducer, seed, options = {}) {
  return createStream(async (controller) => {
    let index = 0;
    let current = seed;

    for await (const chunk of toAsyncIterable(source)) {
      if (controller.signal.aborted) {
        break;
      }

      current = await reducer(current, chunk, index);
      await controller.push(current);
      index += 1;
    }
  }, {
    seed,
    reduce: (_, chunk) => chunk,
    ...options
  });
}

// Re-export the iterable helper so integrations can normalize external sources.
export { toAsyncIterable } from './iterable.js';
