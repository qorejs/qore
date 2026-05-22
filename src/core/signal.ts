import { createRoot, onCleanup } from './owner.js';
import { batch, READ, untrack } from './signal-context.js';
import { ComputedNode, EffectNode, SignalNode } from './signal-nodes.js';
import type { Cleanup, EffectCallback, EffectOptions, SubscribeOptions } from './signal-types.js';

export interface ReadonlySignal<T> {
  (): T;
  peek(): T;
  subscribe(listener: (value: T) => void, options?: SubscribeOptions): Cleanup;
}

export interface Signal<T> extends ReadonlySignal<T> {
  (nextValue: T): T;
  set(nextValue: T): T;
  update(updater: (currentValue: T) => T): T;
}

export interface ComputedSignal<T> extends ReadonlySignal<T> {
  stop(): void;
}

// Create a mutable signal function with helper methods attached to it.
export function signal<T>(initialValue: T): Signal<T> {
  const node = new SignalNode(initialValue);

  const readWriteSignal = ((nextValue = READ) => {
    if (nextValue === READ) {
      return node.get();
    }

    return node.set(nextValue as T);
  }) as Signal<T>;

  readWriteSignal.set = (nextValue) => node.set(nextValue);
  readWriteSignal.update = (updater) => node.update(updater);
  readWriteSignal.peek = () => node.peek();
  readWriteSignal.subscribe = (listener, options) => node.subscribe(listener, options);

  return readWriteSignal;
}

// Create a read-only computed signal backed by dependency tracking.
export function computed<T>(getter: () => T): ComputedSignal<T> {
  const node = new ComputedNode(getter);

  const readOnlySignal = ((nextValue = READ) => {
    if (nextValue !== READ) {
      throw new Error('Computed signals are read-only');
    }

    return node.get();
  }) as ComputedSignal<T>;

  readOnlySignal.peek = () => node.peek();
  readOnlySignal.subscribe = (listener, options) => node.subscribe(listener, options);
  readOnlySignal.stop = () => node.stop();

  return readOnlySignal;
}

// Run a reactive effect and return a disposer for it.
export function effect(fn: EffectCallback, options: EffectOptions = {}): Cleanup {
  const node = new EffectNode(fn, options);
  return () => node.stop();
}

export { batch, untrack } from './signal-context.js';
export { createRoot, onCleanup } from './owner.js';

// Detect Qore signal-like values by their callable shape plus peek helper.
export function isSignal<T = unknown>(value: unknown): value is ReadonlySignal<T> {
  return typeof value === 'function' && typeof (value as Partial<ReadonlySignal<T>>).peek === 'function';
}
