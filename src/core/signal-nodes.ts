import {
  batch,
  cleanupObserver,
  getActiveObserver,
  removePendingObserver,
  scheduleObserver,
  withActiveObserver
} from './signal-context.js';
import { createOwnedScope, disposeOwner, onCleanup, resetOwner, withOwner } from './owner.js';
import { scheduleEffectRun } from './signal-scheduler.js';
import type {
  Cleanup,
  EffectCallback,
  EffectOptions,
  ObserverDependency,
  ReactiveObserver,
  SignalListener,
  SubscribeOptions
} from './signal-types.js';

// A mutable signal node stores a value and fan-outs updates to listeners and observers.
export class SignalNode<T> implements ObserverDependency {
  value: T;
  level = 0;
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

    batch(() => {
      for (const observer of Array.from(this.subscribers)) {
        scheduleObserver(observer);
      }
    });
  }
}

// A computed node re-runs its getter whenever one of its dependencies changes.
export class ComputedNode<T> implements ObserverDependency, ReactiveObserver {
  getter: () => T;
  private owner = createOwnedScope();
  level = 1;
  subscribers = new Set<ReactiveObserver>();
  listeners = new Set<SignalListener<T>>();
  deps = new Set<ObserverDependency>();
  active = true;
  initialized = false;
  value!: T;

  constructor(getter: () => T) {
    this.getter = getter;
    onCleanup(() => this.stop());
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

  schedule(): void {
    this.notify();
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

    resetOwner(this.owner);
    cleanupObserver(this);

    withOwner(this.owner, () => withActiveObserver(this, () => {
      const nextValue = this.getter();
      const changed = !this.initialized || !Object.is(previousValue, nextValue);
      const nextLevel = this.deps.size > 0
        ? Math.max(...Array.from(this.deps, (dependency) => dependency.level)) + 1
        : 1;

      this.value = nextValue;
      this.level = nextLevel;
      this.initialized = true;

      if (!changed) {
        return;
      }

      for (const listener of Array.from(this.listeners)) {
        listener(this.value);
      }

      batch(() => {
        for (const observer of Array.from(this.subscribers)) {
          scheduleObserver(observer);
        }
      });
    }));
  }

  stop(): void {
    if (!this.active) {
      return;
    }

    this.active = false;
    cleanupObserver(this);
    removePendingObserver(this);
    disposeOwner(this.owner);
    this.subscribers.clear();
    this.listeners.clear();
  }
}

// Effects are observers with optional cleanup that re-run when dependencies change.
export class EffectNode implements ReactiveObserver {
  fn: EffectCallback;
  scheduler: EffectOptions['scheduler'];
  private owner = createOwnedScope();
  level = 1;
  deps = new Set<ObserverDependency>();
  active = true;
  scheduled = false;
  running = false;
  needsRun = false;
  cleanup: Cleanup | null = null;

  constructor(fn: EffectCallback, options: EffectOptions = {}) {
    this.fn = fn;
    this.scheduler = options.scheduler ?? 'sync';
    onCleanup(() => this.stop());
    this.run();
  }

  schedule(): void {
    if (!this.active) {
      return;
    }

    if (this.running) {
      this.needsRun = true;
      return;
    }

    if (this.scheduled) {
      return;
    }

    this.scheduled = true;
    scheduleEffectRun(this.scheduler, () => {
      this.scheduled = false;
      this.run();
    });
  }

  notify(): void {
    this.run();
  }

  // Execute the effect under tracking and remember any returned cleanup callback.
  run(): void {
    if (!this.active) {
      return;
    }

    this.running = true;
    this.needsRun = false;
    const previousCleanup = this.cleanup;
    this.cleanup = null;

    try {
      // Run the previous cleanup before dropping old dependencies so a thrown cleanup
      // does not silently unsubscribe the effect from future source updates.
      if (typeof previousCleanup === 'function') {
        previousCleanup();
      }

      resetOwner(this.owner);
      cleanupObserver(this);

      withOwner(this.owner, () => withActiveObserver(this, () => {
        const maybeCleanup = this.fn();
        this.cleanup = typeof maybeCleanup === 'function' ? maybeCleanup : null;
      }));

      this.level = this.deps.size > 0
        ? Math.max(...Array.from(this.deps, (dependency) => dependency.level)) + 1
        : 1;
    } finally {
      this.running = false;

      if (this.needsRun && this.active) {
        this.schedule();
      }
    }
  }

  stop(): void {
    if (!this.active) {
      return;
    }

    this.active = false;
    this.scheduled = false;
    this.needsRun = false;
    cleanupObserver(this);
    removePendingObserver(this);
    disposeOwner(this.owner);

    if (typeof this.cleanup === 'function') {
      this.cleanup();
      this.cleanup = null;
    }
  }
}
