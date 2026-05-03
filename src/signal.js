// @ts-nocheck
// Use a sentinel so signals can still store undefined as a real value.
const READ = Symbol('qore.signal.read');
let activeObserver = null;
let batchDepth = 0;
const pendingObservers = new Set();
// Remove this observer from every dependency it tracked during the last run.
function cleanupObserver(observer) {
    for (const dep of observer.deps) {
        dep.subscribers.delete(observer);
    }
    observer.deps.clear();
}
// Queue observer work during batching, otherwise notify immediately.
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
// A mutable signal node stores a value and fan-outs updates to listeners and observers.
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
    // Recompute under dependency tracking and notify downstream observers only on change.
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
        }
        finally {
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
// Effects are observers with optional cleanup that re-run when dependencies change.
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
        const previousObserver = activeObserver;
        activeObserver = this;
        try {
            const maybeCleanup = this.fn();
            this.cleanup = typeof maybeCleanup === 'function' ? maybeCleanup : null;
        }
        finally {
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
// Batch synchronous updates so dependent observers only re-run once afterward.
export function batch(fn) {
    batchDepth += 1;
    try {
        return fn();
    }
    finally {
        batchDepth -= 1;
        if (batchDepth === 0) {
            flushObservers();
        }
    }
}
// Read signals without subscribing the current observer to them.
export function untrack(fn) {
    const previousObserver = activeObserver;
    activeObserver = null;
    try {
        return fn();
    }
    finally {
        activeObserver = previousObserver;
    }
}
// Detect Qore signal-like values by their callable shape plus peek helper.
export function isSignal(value) {
    return typeof value === 'function' && typeof value.peek === 'function';
}
