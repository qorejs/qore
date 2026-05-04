// @ts-nocheck
// Normalize backpressure into one consistent shape the runtime can enforce.
export function normalizeBackpressure(backpressure) {
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
export function createDeferred() {
  let resolve = null;
  let reject = null;
  const promise = new Promise((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}
