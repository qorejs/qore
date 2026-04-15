/**
 * Qore Signal System - Fine-grained Reactivity
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
    for (const dep of this.deps) {
      dep.subs.delete(this);
    }
    this.deps.clear();
    
    // Call cleanup before execution
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = undefined;
    }
    
    const prevEffect = activeEffect;
    activeEffect = this;
    try {
      const result = this.fn();
      // Save new cleanup function
      if (typeof result === 'function') {
        this.cleanup = result;
      }
    } finally {
      activeEffect = prevEffect;
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
  
  sig.peek = () => {
    const prev = activeEffect;
    activeEffect = null; // Temporarily disable dependency tracking
    try {
      return node.get();
    } finally {
      activeEffect = prev;
    }
  };
  return sig;
}

export function computed<T>(fn: () => T): Signal<T> {
  let value: T;
  let depsVersion = 0;
  let lastReadVersion = 0;
  const subs = new Set<EffectNode>();
  
  // Create effect node to track dependencies
  const effectNode = new EffectNode(() => {
    depsVersion++;
    // Notify all subscribers when dependencies change
    for (const sub of subs) {
      if (batchDepth > 0) {
        pendingEffects.add(sub);
      } else {
        sub.run();
      }
    }
  });
  
  // Initial dependency collection - must be after creating effectNode
  const prevEffect = activeEffect;
  activeEffect = effectNode;
  try {
    value = fn();
  } finally {
    activeEffect = prevEffect;
  }
  lastReadVersion = depsVersion;
  
  const sig = (val?: T): T => {
    if (val !== undefined) {
      throw new Error('Computed signals are read-only');
    }
    
    // Let current effect subscribe to this computed
    if (activeEffect) {
      subs.add(activeEffect);
    }
    
    // Recalculate if dependencies have changed
    if (depsVersion > lastReadVersion) {
      const prev = activeEffect;
      activeEffect = effectNode;
      try {
        value = fn();
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
      activeEffect = null; // Temporarily disable dependency tracking
      try {
        value = fn();
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
    // Call cleanup
    if (node.cleanup) {
      node.cleanup();
      node.cleanup = undefined;
    }
    // Clean up dependencies
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
