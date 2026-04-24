import { batch, computed, signal } from './signal.js';
import { toAsyncIterable } from './iterable.js';
import { normalizeError } from './utils.js';

export function createResponse(options) {
  const { seed, reduce } = options;

  const status = signal('idle');
  const value = signal(seed);
  const error = signal(null);
  const chunks = signal([]);
  const startedAt = signal(null);
  const finishedAt = signal(null);

  const pending = computed(() => {
    const currentStatus = status();
    return currentStatus === 'pending' || currentStatus === 'streaming';
  });

  const streaming = computed(() => status() === 'streaming');
  const completed = computed(() => status() === 'completed');
  const failed = computed(() => status() === 'error');
  const aborted = computed(() => status() === 'aborted');
  const chunkCount = computed(() => chunks().length);

  let activeController = null;
  let runId = 0;

  function supersedeActiveRun(reason = 'Response superseded by a new run') {
    if (!activeController) {
      return;
    }

    activeController.abort(reason);
    activeController = null;
  }

  function reset(nextSeed = seed) {
    supersedeActiveRun('Response reset');

    batch(() => {
      status('idle');
      value(nextSeed);
      error(null);
      chunks([]);
      startedAt(null);
      finishedAt(null);
    });

    return nextSeed;
  }

  function push(chunk) {
    const currentStatus = status.peek();

    if (currentStatus === 'completed' || currentStatus === 'error' || currentStatus === 'aborted') {
      return value.peek();
    }

    const index = chunks.peek().length;
    const nextValue = reduce(value.peek(), chunk, index);

    batch(() => {
      if (status.peek() === 'idle' || status.peek() === 'pending') {
        status('streaming');
      }

      chunks([...chunks.peek(), chunk]);
      value(nextValue);
    });

    return nextValue;
  }

  function complete() {
    const currentStatus = status.peek();

    if (currentStatus === 'completed' || currentStatus === 'error' || currentStatus === 'aborted') {
      return value.peek();
    }

    activeController = null;

    batch(() => {
      status('completed');
      finishedAt(Date.now());
    });

    return value.peek();
  }

  function fail(reason) {
    const normalizedError = normalizeError(reason);

    activeController = null;

    batch(() => {
      status('error');
      error(normalizedError);
      finishedAt(Date.now());
    });

    return normalizedError;
  }

  function abort(reason = 'Response aborted') {
    const currentStatus = status.peek();

    if (currentStatus !== 'pending' && currentStatus !== 'streaming') {
      return value.peek();
    }

    activeController?.abort(reason);
    activeController = null;

    batch(() => {
      status('aborted');
      finishedAt(Date.now());
    });

    return value.peek();
  }

  async function run(executor, options = {}) {
    const { resetValue = true, nextSeed = seed } = options;

    supersedeActiveRun();

    runId += 1;
    const currentRunId = runId;

    const controller = new AbortController();
    activeController = controller;

    batch(() => {
      if (resetValue) {
        value(nextSeed);
        chunks([]);
      }

      error(null);
      status('pending');
      startedAt(Date.now());
      finishedAt(null);
    });

    const context = {
      get signal() {
        return controller.signal;
      },

      response: api,
      push,
      complete,
      fail,
      abort
    };

    try {
      await executor(context);

      if (currentRunId !== runId || controller.signal.aborted) {
        return value.peek();
      }

      return complete();
    } catch (reason) {
      if (currentRunId !== runId || controller.signal.aborted) {
        return value.peek();
      }

      throw fail(reason);
    } finally {
      if (currentRunId === runId && activeController === controller) {
        activeController = null;
      }
    }
  }

  async function consume(source, options = {}) {
    return run(async ({ signal: abortSignal }) => {
      const resolvedSource = typeof source === 'function'
        && typeof source[Symbol.asyncIterator] !== 'function'
        && typeof source.peek !== 'function'
        ? await source({ signal: abortSignal, response: api })
        : await source;

      for await (const chunk of toAsyncIterable(resolvedSource)) {
        if (abortSignal.aborted) {
          break;
        }

        push(chunk);
      }
    }, options);
  }

  function snapshot() {
    return {
      status: status.peek(),
      value: value.peek(),
      error: error.peek(),
      chunks: chunks.peek(),
      startedAt: startedAt.peek(),
      finishedAt: finishedAt.peek(),
      chunkCount: chunks.peek().length
    };
  }

  const api = {
    status,
    value,
    error,
    chunks,
    startedAt,
    finishedAt,
    pending,
    streaming,
    completed,
    failed,
    aborted,
    chunkCount,
    reset,
    push,
    complete,
    fail,
    abort,
    run,
    consume,
    snapshot
  };

  return api;
}

export const response = {
  create: createResponse,

  text(seed = '') {
    return createResponse({
      seed,
      reduce: (currentValue, chunk) => currentValue + String(chunk)
    });
  },

  list(seed = []) {
    return createResponse({
      seed,
      reduce: (currentValue, chunk) => [...currentValue, chunk]
    });
  },

  latest(seed = null) {
    return createResponse({
      seed,
      reduce: (_, chunk) => chunk
    });
  }
};
