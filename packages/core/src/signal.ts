/**
 * Qore Signal System - Fine-grained Reactivity
 */

type EffectFn = () => void;

let activeEffect: EffectNode | null = null;
let batchDepth = 0;
const pendingEffects = new Set<EffectNode>();

class EffectNode {
  deps = new Set<SignalNode>();
  fn: EffectFn;
  
  constructor(fn: EffectFn) {
    this.fn = fn;
  }
  
  run(): void {
    for (const dep of this.deps) {
      dep.subs.delete(this);
    }
    this.deps.clear();
    
    const prevEffect = activeEffect;
    activeEffect = this;
    try {
      this.fn();
    } finally {
      activeEffect = prevEffect;
    }
  }
}

class SignalNode<T> {
  private value: T;
  private subs = new Set<EffectNode>();
  
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
    if (this.value === newValue) return;
    this.value = newValue;
    this.notify();
  }
  
  private notify(): void {
    const effectsToRun = Array.from(this.subs);
    
    if (batchDepth > 0) {
      effectsToRun.forEach(sub => pendingEffects.add(sub));
      return;
    }
    
    for (const effect of effectsToRun) {
      effect.run();
    }
  }
}

export interface Signal<T> {
  (value?: T): T;
  peek(): T;
}

export function signal<T>(initial: T): Signal<T> {
  const node = new SignalNode(initial);
  
  const sig = (value?: T): T => {
    if (value !== undefined) {
      node.set(value);
      return value;
    }
    return node.get();
  };
  
  sig.peek = () => node.get();
  return sig;
}

export function computed<T>(fn: () => T): Signal<T> {
  let value: T | null = null;
  let dirty = true;
  let effectNode: EffectNode | null = null;
  
  const sig = (val?: T): T => {
    if (val !== undefined) {
      throw new Error('Computed signals are read-only');
    }
    
    if (dirty) {
      const prevEffect = activeEffect;
      if (effectNode) {
        activeEffect = effectNode;
      }
      try {
        value = fn();
        dirty = false;
      } finally {
        activeEffect = prevEffect;
      }
    }
    
    return value!;
  };
  
  effectNode = new EffectNode(() => { dirty = true; });
  
  sig.peek = () => {
    if (dirty) {
      value = fn();
      dirty = false;
    }
    return value!;
  };
  
  return sig;
}

export function effect(fn: EffectFn): () => void {
  const node = new EffectNode(fn);
  node.run();
  return () => {
    for (const dep of node.deps) {
      dep.subs.delete(node);
    }
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
      for (const eff of effects) {
        eff.run();
      }
    }
  }
}
