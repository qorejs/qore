import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signal, computed, effect, batch } from '../src/signal';

describe('Signal - Boundary Conditions', () => {
  it('should handle undefined values', () => {
    const sig = signal(undefined as undefined);
    expect(sig()).toBeUndefined();
    sig(undefined);
    expect(sig()).toBeUndefined();
  });

  it('should handle null values', () => {
    const sig = signal(null as null);
    expect(sig()).toBeNull();
    sig(null);
    expect(sig()).toBeNull();
  });

  it('should handle NaN values', () => {
    const sig = signal(NaN);
    expect(Number.isNaN(sig())).toBe(true);
    sig(NaN);
    expect(Number.isNaN(sig())).toBe(true);
  });

  it('should handle zero values', () => {
    const sig = signal(0);
    expect(sig()).toBe(0);
    sig(0);
    expect(sig()).toBe(0);
  });

  it('should handle empty string', () => {
    const sig = signal('');
    expect(sig()).toBe('');
    sig('');
    expect(sig()).toBe('');
  });

  it('should handle false boolean', () => {
    const sig = signal(false);
    expect(sig()).toBe(false);
    sig(false);
    expect(sig()).toBe(false);
  });

  it('should handle large numbers', () => {
    const sig = signal(Number.MAX_SAFE_INTEGER);
    expect(sig()).toBe(Number.MAX_SAFE_INTEGER);
    sig(Number.MIN_SAFE_INTEGER);
    expect(sig()).toBe(Number.MIN_SAFE_INTEGER);
  });

  it('should handle Infinity', () => {
    const sig = signal(Infinity);
    expect(sig()).toBe(Infinity);
    sig(-Infinity);
    expect(sig()).toBe(-Infinity);
  });

  it('should handle object references', () => {
    const obj = { a: 1 };
    const sig = signal(obj);
    expect(sig()).toBe(obj);
    const newObj = { b: 2 };
    sig(newObj);
    expect(sig()).toBe(newObj);
  });

  it('should handle array references', () => {
    const arr = [1, 2, 3];
    const sig = signal(arr);
    expect(sig()).toBe(arr);
    const newArr = [4, 5, 6];
    sig(newArr);
    expect(sig()).toBe(newArr);
  });

  it('should not trigger effect when setting same value', () => {
    const sig = signal(5);
    let executions = 0;
    effect(() => { sig(); executions++; });
    expect(executions).toBe(1);
    sig(5);
    expect(executions).toBe(1);
  });

  it('should handle rapid value changes', async () => {
    const sig = signal(0);
    const values: number[] = [];
    effect(() => { values.push(sig()); });
    
    batch(() => {
      for (let i = 1; i <= 100; i++) {
        sig(i);
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(values).toEqual([0, 100]);
  });
});

describe('Computed - Circular Dependencies', () => {
  it('should handle computed with multiple dependencies', () => {
    const a = signal(1);
    const b = signal(2);
    const sum = computed(() => a() + b());
    
    expect(sum()).toBe(3);
    a(5);
    expect(sum()).toBe(7);
    b(10);
    expect(sum()).toBe(15);
  });

  it('should handle nested computed', () => {
    const a = signal(2);
    const doubled = computed(() => a() * 2);
    const quadrupled = computed(() => doubled() * 2);
    
    expect(quadrupled()).toBe(8);
    a(5);
    expect(quadrupled()).toBe(20);
  });

  it('should handle computed depending on multiple computed', () => {
    const a = signal(2);
    const b = signal(3);
    const doubled = computed(() => a() * 2);
    const tripled = computed(() => b() * 3);
    const sum = computed(() => doubled() + tripled());
    
    expect(sum()).toBe(13);
    a(5);
    expect(sum()).toBe(19);
  });

  it('should handle computed peek', () => {
    const a = signal(5);
    const doubled = computed(() => a() * 2);
    
    expect(doubled.peek()).toBe(10);
    a(10);
    expect(doubled.peek()).toBe(20);
  });

  it('should handle computed with complex expressions', () => {
    const items = signal([1, 2, 3, 4, 5]);
    const sum = computed(() => items().reduce((acc, val) => acc + val, 0));
    const avg = computed(() => sum() / items().length);
    
    expect(sum()).toBe(15);
    expect(avg()).toBe(3);
    
    items([10, 20, 30]);
    expect(sum()).toBe(60);
    expect(avg()).toBe(20);
  });

  it('should handle computed with conditional logic', () => {
    const count = signal(0);
    const label = computed(() => count() === 0 ? 'none' : count() === 1 ? 'one' : 'many');
    
    expect(label()).toBe('none');
    count(1);
    expect(label()).toBe('one');
    count(5);
    expect(label()).toBe('many');
  });

  it('should handle computed throwing error on write', () => {
    const a = signal(5);
    const doubled = computed(() => a() * 2);
    expect(() => doubled(10)).toThrow('Computed signals are read-only');
  });
});

describe('Effect - Cleanup and Error Handling', () => {
  it('should call cleanup function before re-running', () => {
    const sig = signal(0);
    const cleanups: number[] = [];
    
    effect(() => {
      const value = sig();
      return () => {
        cleanups.push(value);
      };
    });
    
    expect(cleanups).toEqual([]);
    sig(1);
    expect(cleanups).toEqual([0]);
    sig(2);
    expect(cleanups).toEqual([0, 1]);
  });

  it('should call cleanup when stopped', () => {
    const sig = signal(0);
    let cleanupCalled = false;
    
    const stop = effect(() => {
      sig();
      return () => {
        cleanupCalled = true;
      };
    });
    
    expect(cleanupCalled).toBe(false);
    stop();
    expect(cleanupCalled).toBe(true);
  });

  it('should handle effect throwing error', () => {
    const sig = signal(0);
    let errorCaught = false;
    
    try {
      effect(() => {
        if (sig() > 0) {
          throw new Error('Test error');
        }
      });
    } catch {
      errorCaught = true;
    }
    
    expect(errorCaught).toBe(false); // Initial run doesn't throw
    
    expect(() => sig(1)).toThrow('Test error');
  });

  it('should continue running after error in one effect', async () => {
    const sig = signal(0);
    let effect1Runs = 0;
    let effect2Runs = 0;
    
    effect(() => {
      sig();
      effect1Runs++;
      if (sig() === 1) throw new Error('Test error');
    });
    
    effect(() => {
      sig();
      effect2Runs++;
    });
    
    expect(effect1Runs).toBe(1);
    expect(effect2Runs).toBe(1);
    
    try {
      sig(1);
    } catch {
      // Expected
    }
    
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(effect2Runs).toBe(2);
  });

  it('should handle cleanup throwing error', () => {
    const sig = signal(0);
    
    effect(() => {
      sig();
      return () => {
        throw new Error('Cleanup error');
      };
    });
    
    expect(() => sig(1)).toThrow('Cleanup error');
  });

  it('should not track dependencies in cleanup', () => {
    const sig1 = signal(0);
    const sig2 = signal(0);
    let effectRuns = 0;
    
    effect(() => {
      sig1();
      effectRuns++;
      return () => {
        sig2(); // This should not create a dependency
      };
    });
    
    expect(effectRuns).toBe(1);
    sig2(1);
    expect(effectRuns).toBe(1); // Should not re-run
  });

  it('should handle multiple effects on same signal', async () => {
    const sig = signal(0);
    let effect1Runs = 0;
    let effect2Runs = 0;
    let effect3Runs = 0;
    
    effect(() => { sig(); effect1Runs++; });
    effect(() => { sig(); effect2Runs++; });
    effect(() => { sig(); effect3Runs++; });
    
    expect(effect1Runs).toBe(1);
    expect(effect2Runs).toBe(1);
    expect(effect3Runs).toBe(1);
    
    sig(1);
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(effect1Runs).toBe(2);
    expect(effect2Runs).toBe(2);
    expect(effect3Runs).toBe(2);
  });
});

describe('Batch - Nested Batches', () => {
  it('should handle nested batch calls', async () => {
    const sig = signal(0);
    let executions = 0;
    
    effect(() => { sig(); executions++; });
    
    batch(() => {
      sig(1);
      batch(() => {
        sig(2);
        sig(3);
      });
      sig(4);
    });
    
    expect(sig()).toBe(4);
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(executions).toBe(2); // Initial + 1 batched
  });

  it('should handle deeply nested batches', async () => {
    const sig = signal(0);
    let executions = 0;
    
    effect(() => { sig(); executions++; });
    
    batch(() => {
      sig(1);
      batch(() => {
        sig(2);
        batch(() => {
          sig(3);
          batch(() => {
            sig(4);
          });
          sig(5);
        });
        sig(6);
      });
      sig(7);
    });
    
    expect(sig()).toBe(7);
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(executions).toBe(2);
  });

  it('should handle batch with multiple signals', async () => {
    const a = signal(0);
    const b = signal(0);
    let executions = 0;
    
    effect(() => { a(); b(); executions++; });
    
    batch(() => {
      a(1);
      b(2);
      a(3);
      b(4);
    });
    
    expect(a()).toBe(3);
    expect(b()).toBe(4);
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(executions).toBe(2);
  });

  it('should handle batch returning value', () => {
    const sig = signal(0);
    
    const result = batch(() => {
      sig(5);
      return sig() * 2;
    });
    
    expect(result).toBe(10);
    expect(sig()).toBe(5);
  });

  it('should handle batch throwing error', () => {
    const sig = signal(0);
    
    expect(() => {
      batch(() => {
        sig(1);
        throw new Error('Batch error');
      });
    }).toThrow('Batch error');
    
    expect(sig()).toBe(1); // Change should persist
  });

  it('should flush effects only on outermost batch exit', async () => {
    const sig = signal(0);
    const executionOrder: number[] = [];
    
    effect(() => {
      executionOrder.push(sig());
    });
    
    batch(() => {
      sig(1);
      batch(() => {
        sig(2);
        sig(3);
      });
      // Effects should not have run yet
      expect(executionOrder).toEqual([0]);
    });
    
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(executionOrder).toEqual([0, 3]);
  });
});

describe('Signal - Peek Functionality', () => {
  it('should peek without creating dependency', () => {
    const sig = signal(5);
    let executions = 0;
    
    effect(() => {
      sig.peek();
      executions++;
    });
    
    expect(executions).toBe(1);
    sig(10);
    expect(executions).toBe(1); // Should not re-run
  });

  it('should peek computed without creating dependency', () => {
    const a = signal(5);
    const computed = computed(() => a() * 2);
    let executions = 0;
    
    effect(() => {
      computed.peek();
      executions++;
    });
    
    expect(executions).toBe(1);
    a(10);
    expect(executions).toBe(1);
  });
});
