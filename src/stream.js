import { createResponse } from './response.js';
import { toAsyncIterable } from './iterable.js';
import { normalizeError, sleep } from './utils.js';

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

function createReadableSignal(sourceSignal) {
  const read = () => sourceSignal();

  read.peek = () => sourceSignal.peek();
  read.subscribe = (listener, options) => sourceSignal.subscribe(listener, options);

  return read;
}

function reduceText(currentValue, chunk) {
  return currentValue + String(chunk ?? '');
}

async function pipeSource(source, controller) {
  for await (const chunk of toAsyncIterable(source)) {
    if (controller.signal.aborted) {
      break;
    }

    controller.push(chunk);
  }
}

async function startSource(sourceOrSetup, controller) {
  if (typeof sourceOrSetup === 'function') {
    const maybeSource = await sourceOrSetup(controller);

    if (maybeSource !== undefined) {
      await pipeSource(maybeSource, controller);
    }

    return;
  }

  await pipeSource(sourceOrSetup, controller);
}

export function createStream(sourceOrSetup, options = {}) {
  const {
    seed = '',
    reduce = reduceText
  } = options;

  const state = createResponse({ seed, reduce });
  const queue = new AsyncQueue();
  const readable = createReadableSignal(state.value);

  let activeSignal = null;
  let terminated = false;

  const stopStream = (finalizer) => {
    if (terminated) {
      return readable.peek();
    }

    terminated = true;
    queue.close();
    return finalizer();
  };

  const run = state.run(async ({ signal, push, complete, fail, abort }) => {
    activeSignal = signal;

    const controller = {
      get signal() {
        return signal;
      },

      push(chunk) {
        if (terminated || signal.aborted) {
          return readable.peek();
        }

        queue.push(chunk);
        return push(chunk);
      },

      done() {
        return stopStream(() => complete());
      },

      fail(error) {
        if (terminated) {
          return state.error.peek();
        }

        terminated = true;
        queue.fail(error);
        return fail(error);
      },

      abort(reason = 'Stream aborted') {
        return stopStream(() => abort(reason));
      }
    };

    try {
      await startSource(sourceOrSetup, controller);

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
  readable.ready = run;
  readable.abort = (reason) => stopStream(() => state.abort(reason));

  Object.defineProperty(readable, 'signal', {
    enumerable: true,
    get() {
      return activeSignal;
    }
  });

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

export function stream(sourceOrSetup, options = {}) {
  return createStream(sourceOrSetup, {
    seed: '',
    reduce: reduceText,
    ...options
  });
}

stream.create = createStream;

stream.text = (sourceOrSetup, options = {}) => createStream(sourceOrSetup, {
  seed: '',
  reduce: reduceText,
  ...options
});

stream.list = (sourceOrSetup, options = {}) => createStream(sourceOrSetup, {
  seed: [],
  reduce: (currentValue, chunk) => [...currentValue, chunk],
  ...options
});

stream.latest = (sourceOrSetup, options = {}) => createStream(sourceOrSetup, {
  seed: null,
  reduce: (_, chunk) => chunk,
  ...options
});

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

      controller.push(chunk);
    }
  }, streamOptions);
}

export function mapStream(source, mapper, options = {}) {
  return createStream(async (controller) => {
    let index = 0;

    for await (const chunk of toAsyncIterable(source)) {
      if (controller.signal.aborted) {
        break;
      }

      controller.push(await mapper(chunk, index));
      index += 1;
    }
  }, options);
}

export function scanStream(source, reducer, seed, options = {}) {
  return createStream(async (controller) => {
    let index = 0;
    let current = seed;

    for await (const chunk of toAsyncIterable(source)) {
      if (controller.signal.aborted) {
        break;
      }

      current = await reducer(current, chunk, index);
      controller.push(current);
      index += 1;
    }
  }, {
    seed,
    reduce: (_, chunk) => chunk,
    ...options
  });
}

export { toAsyncIterable } from './iterable.js';
