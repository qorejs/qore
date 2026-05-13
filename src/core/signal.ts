// @ts-nocheck
import { batch, READ, untrack } from './signal-context.js';
import { ComputedNode, EffectNode, SignalNode } from './signal-nodes.js';

// Create a mutable signal function with helper methods attached to it.
export function signal(initialValue) {
  const node = new SignalNode(initialValue);

  const readWriteSignal = (nextValue = READ) => {
    if (nextValue === READ) {
      return node.get();
    }

    return node.set(nextValue);
  };

  readWriteSignal.set = (nextValue) => node.set(nextValue);
  readWriteSignal.update = (updater) => node.update(updater);
  readWriteSignal.peek = () => node.peek();
  readWriteSignal.subscribe = (listener, options) => node.subscribe(listener, options);

  return readWriteSignal;
}

// Create a read-only computed signal backed by dependency tracking.
export function computed(getter) {
  const node = new ComputedNode(getter);

  const readOnlySignal = (nextValue = READ) => {
    if (nextValue !== READ) {
      throw new Error('Computed signals are read-only');
    }

    return node.get();
  };

  readOnlySignal.peek = () => node.peek();
  readOnlySignal.subscribe = (listener, options) => node.subscribe(listener, options);
  readOnlySignal.stop = () => node.stop();

  return readOnlySignal;
}

// Run a reactive effect and return a disposer for it.
export function effect(fn) {
  const node = new EffectNode(fn);
  return () => node.stop();
}

export { batch, untrack } from './signal-context.js';

// Detect Qore signal-like values by their callable shape plus peek helper.
export function isSignal(value) {
  return typeof value === 'function' && typeof value.peek === 'function';
}
