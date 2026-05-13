// @ts-nocheck
import {
  cleanupObserver,
  getActiveObserver,
  removePendingObserver,
  scheduleObserver,
  withActiveObserver
} from './signal-context.js';

// A mutable signal node stores a value and fan-outs updates to listeners and observers.
export class SignalNode {
  constructor(initialValue) {
    this.value = initialValue;
    this.subscribers = new Set();
    this.listeners = new Set();
  }

  get() {
    const activeObserver = getActiveObserver();

    if (activeObserver) {
      this.subscribers.add(activeObserver);
      activeObserver.deps.add(this);
    }

    return this.value;
  }

  peek() {
    return this.value;
  }

  set(nextValue) {
    if (Object.is(this.value, nextValue)) {
      return this.value;
    }

    this.value = nextValue;
    this.emit();
    return this.value;
  }

  update(updater) {
    return this.set(updater(this.value));
  }

  subscribe(listener, options = {}) {
    const { immediate = true } = options;

    this.listeners.add(listener);

    if (immediate) {
      listener(this.value);
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  // Snapshot listeners first so resubscription during notification cannot loop forever.
  emit() {
    for (const listener of Array.from(this.listeners)) {
      listener(this.value);
    }

    for (const observer of Array.from(this.subscribers)) {
      scheduleObserver(observer);
    }
  }
}

// A computed node re-runs its getter whenever one of its dependencies changes.
export class ComputedNode {
  constructor(getter) {
    this.getter = getter;
    this.subscribers = new Set();
    this.listeners = new Set();
    this.deps = new Set();
    this.active = true;
    this.initialized = false;
    this.value = undefined;

    this.recompute();
  }

  get() {
    const activeObserver = getActiveObserver();

    if (activeObserver) {
      this.subscribers.add(activeObserver);
      activeObserver.deps.add(this);
    }

    return this.value;
  }

  peek() {
    return this.value;
  }

  notify() {
    this.recompute();
  }

  subscribe(listener, options = {}) {
    const { immediate = true } = options;

    this.listeners.add(listener);

    if (immediate) {
      listener(this.value);
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  // Recompute under dependency tracking and notify downstream observers only on change.
  recompute() {
    if (!this.active) {
      return;
    }

    const previousValue = this.value;

    cleanupObserver(this);

    withActiveObserver(this, () => {
      const nextValue = this.getter();
      const changed = !this.initialized || !Object.is(previousValue, nextValue);

      this.value = nextValue;
      this.initialized = true;

      if (!changed) {
        return;
      }

      for (const listener of Array.from(this.listeners)) {
        listener(this.value);
      }

      for (const observer of Array.from(this.subscribers)) {
        scheduleObserver(observer);
      }
    });
  }

  stop() {
    if (!this.active) {
      return;
    }

    this.active = false;
    cleanupObserver(this);
    removePendingObserver(this);
    this.subscribers.clear();
    this.listeners.clear();
  }
}

// Effects are observers with optional cleanup that re-run when dependencies change.
export class EffectNode {
  constructor(fn) {
    this.fn = fn;
    this.deps = new Set();
    this.active = true;
    this.cleanup = null;

    this.run();
  }

  notify() {
    this.run();
  }

  // Execute the effect under tracking and remember any returned cleanup callback.
  run() {
    if (!this.active) {
      return;
    }

    cleanupObserver(this);

    if (typeof this.cleanup === 'function') {
      this.cleanup();
      this.cleanup = null;
    }

    withActiveObserver(this, () => {
      const maybeCleanup = this.fn();
      this.cleanup = typeof maybeCleanup === 'function' ? maybeCleanup : null;
    });
  }

  stop() {
    if (!this.active) {
      return;
    }

    this.active = false;
    cleanupObserver(this);
    removePendingObserver(this);

    if (typeof this.cleanup === 'function') {
      this.cleanup();
      this.cleanup = null;
    }
  }
}
