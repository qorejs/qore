/**
 * Qore Signal System - Fine-grained Reactivity
 * Optimized for minimal bundle size and maximum performance
 */

type EffectFn = () => void | (() => void);

let activeEffect: EffectNode | null = null;
let batchDepth = 0;
const pendingEffects = new Set<EffectNode>();

class EffectNode {
  deps = new Set<SignalNode<any>>();
  fn: EffectFn;
  cleanup?: () => void;
  
  constructor(fn: EffectFn) {
    this.fn = fn;
  }
  
  run(): void {
    // Clean up old dependencies
    for (const dep of this.deps) dep.subs.delete(this);
    this.deps.clear();
    
    // Call cleanup before execution
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = undefined;
    }
    
    const prev = activeEffect;
    activeEffect = this;
    try {
      const result = this.fn();
      if (typeof result === 'function') this.cleanup = result;
    } finally {
      activeEffect = prev;
    }
  }
}

class SignalNode<T> {
  private value: T;
  subs = new Set<EffectNode>();
  
  constructor(initial: T) {
    this.value = initial;
  }
  
  get(): T {
    if (activeEffect) {
      this.subs.add(activeEffect);
      activeEffect.deps.add(this);
    }
    return this.value;
  }
  
  set(newValue: T): void {
    if (this.value !== newValue) {
      this.value = newValue;
      this.notify();
    }
  }
  
  private notify(): void {
    if (batchDepth > 0) {
      this.subs.forEach(sub => pendingEffects.add(sub));
      return;
    }
    this.subs.forEach(effect => effect.run());
  }
}

export interface Signal<T> {
  (value?: T): T;
  peek(): T;
}

export function signal<T>(initial: T): Signal<T> {
  const node = new SignalNode<T>(initial);
  
  const sig = (value?: T): T => {
    if (value !== undefined) {
      node.set(value);
      return value;
    }
    return node.get();
  };
  
  sig.peek = () => {
    const prev = activeEffect;
    activeEffect = null;
    try {
      return node.get();
    } finally {
      activeEffect = prev;
    }
  };
  
  return sig;
}

export function computed<T>(getter: () => T): Signal<T> {
  let value: T;
  let depsVersion = 0;
  let lastReadVersion = 0;
  const subs = new Set<EffectNode>();
  
  const effectNode = new EffectNode(() => {
    depsVersion++;
    subs.forEach(sub => {
      if (batchDepth > 0) pendingEffects.add(sub);
      else sub.run();
    });
  });
  
  const prev = activeEffect;
  activeEffect = effectNode;
  try {
    value = getter();
  } finally {
    activeEffect = prev;
  }
  lastReadVersion = depsVersion;
  
  const sig = (val?: T): T => {
    if (val !== undefined) throw new Error('Computed signals are read-only');
    if (activeEffect) subs.add(activeEffect);
    
    if (depsVersion > lastReadVersion) {
      const prev = activeEffect;
      activeEffect = effectNode;
      try {
        value = getter();
      } finally {
        activeEffect = prev;
      }
      lastReadVersion = depsVersion;
    }
    return value;
  };
  
  sig.peek = () => {
    if (depsVersion > lastReadVersion) {
      const prev = activeEffect;
      activeEffect = null;
      try {
        value = getter();
      } finally {
        activeEffect = prev;
      }
      lastReadVersion = depsVersion;
    }
    return value;
  };
  
  return sig;
}

export function effect(fn: EffectFn): () => void {
  const node = new EffectNode(fn);
  node.run();
  return () => {
    if (node.cleanup) {
      node.cleanup();
      node.cleanup = undefined;
    }
    node.deps.forEach(dep => dep.subs.delete(node));
    node.deps.clear();
  };
}

export function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      const effects = Array.from(pendingEffects);
      pendingEffects.clear();
      effects.forEach(eff => eff.run());
    }
  }
}
