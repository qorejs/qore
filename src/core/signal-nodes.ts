import {
  cleanupObserver,
  getActiveObserver,
  removePendingObserver,
  scheduleObserver,
  withActiveObserver
} from './signal-context.js';
import type {
  Cleanup,
  EffectCallback,
  ObserverDependency,
  ReactiveObserver,
  SignalListener,
  SubscribeOptions
} from './signal-types.js';

// A mutable signal node stores a value and fan-outs updates to listeners and observers.
export class SignalNode<T> implements ObserverDependency {
  value: T;
  subscribers = new Set<ReactiveObserver>();
  listeners = new Set<SignalListener<T>>();

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  get(): T {
    const activeObserver = getActiveObserver();

    if (activeObserver) {
      this.subscribers.add(activeObserver);
      activeObserver.deps.add(this);
    }

    return this.value;
  }

  peek(): T {
    return this.value;
  }

  set(nextValue: T): T {
    if (Object.is(this.value, nextValue)) {
      return this.value;
    }

    this.value = nextValue;
    this.emit();
    return this.value;
  }

  update(updater: (currentValue: T) => T): T {
    return this.set(updater(this.value));
  }

  subscribe(listener: SignalListener<T>, options: SubscribeOptions = {}): Cleanup {
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
  emit(): void {
    for (const listener of Array.from(this.listeners)) {
      listener(this.value);
    }

    for (const observer of Array.from(this.subscribers)) {
      scheduleObserver(observer);
    }
  }
}

// A computed node re-runs its getter whenever one of its dependencies changes.
export class ComputedNode<T> implements ObserverDependency, ReactiveObserver {
  getter: () => T;
  subscribers = new Set<ReactiveObserver>();
  listeners = new Set<SignalListener<T>>();
  deps = new Set<ObserverDependency>();
  active = true;
  initialized = false;
  value!: T;

  constructor(getter: () => T) {
    this.getter = getter;
    this.recompute();
  }

  get(): T {
    const activeObserver = getActiveObserver();

    if (activeObserver) {
      this.subscribers.add(activeObserver);
      activeObserver.deps.add(this);
    }

    return this.value;
  }

  peek(): T {
    return this.value;
  }

  notify(): void {
    this.recompute();
  }

  subscribe(listener: SignalListener<T>, options: SubscribeOptions = {}): Cleanup {
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
  recompute(): void {
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

  stop(): void {
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
export class EffectNode implements ReactiveObserver {
  fn: EffectCallback;
  deps = new Set<ObserverDependency>();
  active = true;
  cleanup: Cleanup | null = null;

  constructor(fn: EffectCallback) {
    this.fn = fn;
    this.run();
  }

  notify(): void {
    this.run();
  }

  // Execute the effect under tracking and remember any returned cleanup callback.
  run(): void {
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

  stop(): void {
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
