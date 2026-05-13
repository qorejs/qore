// @ts-nocheck
import { batch } from './signal.js';
import { toAsyncIterable } from './iterable.js';
import { createResponseState, isTerminalStatus } from './response-state.js';
import { normalizeError } from '../shared/utils.js';

// Build a response state machine that accumulates chunks into a reactive value.
export function createResponse(options) {
  const { seed, reduce } = options;
  const state = createResponseState(seed);
  const {
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
    chunkCount
  } = state;

  let activeController = null;
  let runId = 0;

  // Abort the active executor when a new run supersedes it.
  function supersedeActiveRun(reason = 'Response superseded by a new run') {
    if (!activeController) {
      return;
    }

    activeController.abort(reason);
    activeController = null;
  }

  // Reset the response to its initial seed and clear all lifecycle markers.
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

  // Push a chunk through the reducer and advance the response into streaming state.
  function push(chunk) {
    const currentStatus = status.peek();

    if (isTerminalStatus(currentStatus)) {
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

  // Mark the response as completed and freeze the current accumulated value.
  function complete() {
    const currentStatus = status.peek();

    if (isTerminalStatus(currentStatus)) {
      return value.peek();
    }

    activeController = null;

    batch(() => {
      status('completed');
      finishedAt(Date.now());
    });

    return value.peek();
  }

  // Capture an error unless the response is already closed.
  function fail(reason) {
    const currentStatus = status.peek();
    const normalizedError = normalizeError(reason);

    if (isTerminalStatus(currentStatus)) {
      return currentStatus === 'error' ? error.peek() : value.peek();
    }

    activeController = null;

    batch(() => {
      status('error');
      error(normalizedError);
      finishedAt(Date.now());
    });

    return normalizedError;
  }

  // Abort an in-flight response while keeping the value accumulated so far.
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

  // Run an async executor and guard every lifecycle method to the active run only.
  async function run(executor, options = {}) {
    const { resetValue = true, nextSeed = seed } = options;

    supersedeActiveRun();

    runId += 1;
    const currentRunId = runId;

    const controller = new AbortController();
    activeController = controller;

    // A response may outlive older executors, so every write must prove it still owns the run.
    const isCurrentRun = () => (
      currentRunId === runId
      && activeController === controller
      && !controller.signal.aborted
    );

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

    // Expose guarded lifecycle helpers so stale executors cannot leak writes into the latest run.
    const context = {
      get signal() {
        return controller.signal;
      },

      response: api,
      push(chunk) {
        if (!isCurrentRun()) {
          return value.peek();
        }

        return push(chunk);
      },
      complete() {
        if (!isCurrentRun()) {
          return value.peek();
        }

        return complete();
      },
      fail(reason) {
        if (!isCurrentRun()) {
          return status.peek() === 'error' ? error.peek() : value.peek();
        }

        return fail(reason);
      },
      abort(reason) {
        if (!isCurrentRun()) {
          return value.peek();
        }

        return abort(reason);
      }
    };

    try {
      await executor(context);

      if (!isCurrentRun()) {
        return value.peek();
      }

      return complete();
    } catch (reason) {
      if (!isCurrentRun()) {
        return value.peek();
      }

      throw fail(reason);
    } finally {
      if (currentRunId === runId && activeController === controller) {
        activeController = null;
      }
    }
  }

  // Consume any async iterable-like source and route each chunk through the guarded writer.
  async function consume(source, options = {}) {
    return run(async ({ signal: abortSignal, push: write }) => {
      const resolvedSource = typeof source === 'function'
        && typeof source[Symbol.asyncIterator] !== 'function'
        && typeof source.peek !== 'function'
        ? await source({ signal: abortSignal, response: api })
        : await source;

      for await (const chunk of toAsyncIterable(resolvedSource)) {
        if (abortSignal.aborted) {
          break;
        }

        write(chunk);
      }
    }, options);
  }

  // Return a plain snapshot suitable for inspection without exposing mutable internals.
  function snapshot() {
    return {
      status: status.peek(),
      value: value.peek(),
      error: error.peek(),
      chunks: [...chunks.peek()],
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
