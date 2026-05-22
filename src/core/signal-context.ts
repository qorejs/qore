import type { ReactiveObserver } from './signal-types.js';

// Use a sentinel so signals can still store undefined as a real value.
export const READ = Symbol('qore.signal.read');

let activeObserver: ReactiveObserver | null = null;
let batchDepth = 0;
const pendingObservers = new Set<ReactiveObserver>();
let flushingObservers = false;

export function getActiveObserver(): ReactiveObserver | null {
  return activeObserver;
}

export function setActiveObserver(observer: ReactiveObserver | null): void {
  activeObserver = observer;
}

export function withActiveObserver<T>(observer: ReactiveObserver | null, fn: () => T): T {
  const previousObserver = activeObserver;
  activeObserver = observer;

  try {
    return fn();
  } finally {
    activeObserver = previousObserver;
  }
}

// Remove this observer from every dependency it tracked during the last run.
export function cleanupObserver(observer: ReactiveObserver): void {
  for (const dep of observer.deps) {
    dep.subscribers.delete(observer);
  }

  observer.deps.clear();
}

// Queue observer work during batching, otherwise notify immediately.
export function scheduleObserver(observer: ReactiveObserver): void {
  if (!observer.active) {
    return;
  }

  pendingObservers.add(observer);

  if (batchDepth > 0 || flushingObservers) {
    return;
  }

  flushObservers();
}

export function removePendingObserver(observer: ReactiveObserver): void {
  pendingObservers.delete(observer);
}

// Flush batched observer work in FIFO-like waves until the queue is empty.
function flushObservers(): void {
  flushingObservers = true;
  try {
    while (pendingObservers.size > 0) {
      const queue = Array.from(pendingObservers);
      pendingObservers.clear();
      queue.sort((left, right) => left.level - right.level);

      for (const observer of queue) {
        if (observer.active) {
          observer.schedule();
        }
      }
    }
  } finally {
    flushingObservers = false;
  }
}

// Batch synchronous updates so dependent observers only re-run once afterward.
export function batch<T>(fn: () => T): T {
  batchDepth += 1;

  try {
    return fn();
  } finally {
    batchDepth -= 1;

    if (batchDepth === 0 && !flushingObservers) {
      flushObservers();
    }
  }
}

// Read signals without subscribing the current observer to them.
export function untrack<T>(fn: () => T): T {
  return withActiveObserver(null, fn);
}
