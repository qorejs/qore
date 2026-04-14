/**
 * Qore Reactive System - Signal-based reactivity
 * The core of AI Era UI
 */

/**
 * Signal - The core reactive primitive
 */
export class Signal<T> {
  private _value: T;
  private _subs: Set<Effect> = new Set();

  constructor(initialValue: T) {
    this._value = initialValue;
  }

  get(): T {
    if (activeEffect) {
      activeEffect.track(this);
    }
    return this._value;
  }

  set(newValue: T): void {
    if (this._value !== newValue) {
      this._value = newValue;
      const subs = Array.from(this._subs);
      subs.forEach(effect => effect.notify());
    }
  }

  update(fn: (value: T) => T): void {
    this.set(fn(this._value));
  }
}

/**
 * Computed - Derived reactive value
 */
export class Computed<T> {
  private _value: T | null = null;
  private _dirty = true;
  private _effect: Effect | null = null;

  constructor(private _fn: () => T) {
    this._effect = new Effect(() => {
      this._fn();
      this._dirty = true;
    });
  }

  get(): T {
    if (this._dirty) {
      this._value = this._fn();
      this._dirty = false;
    }
    if (activeEffect) {
      activeEffect.trackComputed(this);
    }
    return this._value!;
  }
}

/**
 * Effect - Reactive computation
 */
export class Effect {
  private _fn: () => void;
  private _deps: Set<Signal<any>> = new Set();
  private _notifyQueue: Effect[] = [];

  constructor(fn: () => void) {
    this._fn = fn;
  }

  track(signal: Signal<any>): void {
    if (!this._deps.has(signal)) {
      this._deps.add(signal);
      (signal as any)._subs.add(this);
    }
  }

  trackComputed(_computed: Computed<any>): void {}

  run(): void {
    this._deps.forEach(dep => (dep as any)._subs.delete(this));
    this._deps.clear();
    
    const prevEffect = activeEffect;
    activeEffect = this;
    try {
      this._fn();
    } finally {
      activeEffect = prevEffect;
    }
  }

  notify(): void {
    if (!this._notifyQueue.includes(this)) {
      this._notifyQueue.push(this);
      queueMicrotask(() => {
        const effects = [...this._notifyQueue];
        this._notifyQueue = [];
        effects.forEach(eff => eff.run());
      });
    }
  }

  stop(): void {
    this._deps.forEach(dep => (dep as any)._subs.delete(this));
    this._deps.clear();
  }
}

let activeEffect: Effect | null = null;

export function signal<T>(initialValue: T): Signal<T> {
  return new Signal(initialValue);
}

export function computed<T>(fn: () => T): Computed<T> {
  return new Computed(fn);
}

export function effect(fn: () => void): () => void {
  const eff = new Effect(fn);
  eff.run();
  return () => eff.stop();
}

export function batch<T>(fn: () => T): T {
  return fn();
}
