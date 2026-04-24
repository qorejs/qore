const READ = Symbol('qore.signal.read');

let activeObserver = null;
let batchDepth = 0;
const pendingObservers = new Set();

function cleanupObserver(observer) {
  for (const dep of observer.deps) {
    dep.subscribers.delete(observer);
  }

  observer.deps.clear();
}

function scheduleObserver(observer) {
  if (!observer.active) {
    return;
  }

  if (batchDepth > 0) {
    pendingObservers.add(observer);
    return;
  }

  observer.notify();
}

function flushObservers() {
  while (pendingObservers.size > 0) {
    const queue = Array.from(pendingObservers);
    pendingObservers.clear();

    for (const observer of queue) {
      observer.notify();
    }
  }
}

class SignalNode {
  constructor(initialValue) {
    this.value = initialValue;
    this.subscribers = new Set();
    this.listeners = new Set();
  }

  get() {
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

  emit() {
    for (const listener of Array.from(this.listeners)) {
      listener(this.value);
    }

    for (const observer of Array.from(this.subscribers)) {
      scheduleObserver(observer);
    }
  }
}

class ComputedNode {
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

  recompute() {
    if (!this.active) {
      return;
    }

    const previousValue = this.value;

    cleanupObserver(this);

    const previousObserver = activeObserver;
    activeObserver = this;

    try {
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
    } finally {
      activeObserver = previousObserver;
    }
  }

  stop() {
    if (!this.active) {
      return;
    }

    this.active = false;
    cleanupObserver(this);
    pendingObservers.delete(this);
    this.subscribers.clear();
    this.listeners.clear();
  }
}

class EffectNode {
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

  run() {
    if (!this.active) {
      return;
    }

    cleanupObserver(this);

    if (typeof this.cleanup === 'function') {
      this.cleanup();
      this.cleanup = null;
    }

    const previousObserver = activeObserver;
    activeObserver = this;

    try {
      const maybeCleanup = this.fn();
      this.cleanup = typeof maybeCleanup === 'function' ? maybeCleanup : null;
    } finally {
      activeObserver = previousObserver;
    }
  }

  stop() {
    if (!this.active) {
      return;
    }

    this.active = false;
    cleanupObserver(this);
    pendingObservers.delete(this);

    if (typeof this.cleanup === 'function') {
      this.cleanup();
      this.cleanup = null;
    }
  }
}

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

export function effect(fn) {
  const node = new EffectNode(fn);
  return () => node.stop();
}

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

export function untrack(fn) {
  const previousObserver = activeObserver;
  activeObserver = null;

  try {
    return fn();
  } finally {
    activeObserver = previousObserver;
  }
}

export function isSignal(value) {
  return typeof value === 'function' && typeof value.peek === 'function';
}
