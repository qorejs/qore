// @ts-nocheck
// Use a sentinel so signals can still store undefined as a real value.
export const READ = Symbol('qore.signal.read');

let activeObserver = null;
let batchDepth = 0;
const pendingObservers = new Set();

export function getActiveObserver() {
  return activeObserver;
}

export function setActiveObserver(observer) {
  activeObserver = observer;
}

export function withActiveObserver(observer, fn) {
  const previousObserver = activeObserver;
  activeObserver = observer;

  try {
    return fn();
  } finally {
    activeObserver = previousObserver;
  }
}

// Remove this observer from every dependency it tracked during the last run.
export function cleanupObserver(observer) {
  for (const dep of observer.deps) {
    dep.subscribers.delete(observer);
  }

  observer.deps.clear();
}

// Queue observer work during batching, otherwise notify immediately.
export function scheduleObserver(observer) {
  if (!observer.active) {
    return;
  }

  if (batchDepth > 0) {
    pendingObservers.add(observer);
    return;
  }

  observer.notify();
}

export function removePendingObserver(observer) {
  pendingObservers.delete(observer);
}

// Flush batched observer work in FIFO-like waves until the queue is empty.
function flushObservers() {
  while (pendingObservers.size > 0) {
    const queue = Array.from(pendingObservers);
    pendingObservers.clear();

    for (const observer of queue) {
      observer.notify();
    }
  }
}

// Batch synchronous updates so dependent observers only re-run once afterward.
export function batch(fn) {
  batchDepth += 1;

  try {
    return fn();
  } finally {
    batchDepth -= 1;

    if (batchDepth === 0) {
      flushObservers();
    }
  }
}

// Read signals without subscribing the current observer to them.
export function untrack(fn) {
  return withActiveObserver(null, fn);
}
