import { describe, it, expect } from 'vitest';
import { signal, computed, effect, batch } from '../src/signal';

describe('Signal', () => {
  it('should create signal with initial value', () => {
    const count = signal(0);
    expect(count()).toBe(0);
  });

  it('should update value with write call', () => {
    const count = signal(0);
    count(5);
    expect(count()).toBe(5);
  });

  it('should support update pattern', () => {
    const count = signal(0);
    count(count() + 1);
    expect(count()).toBe(1);
  });
});

describe('Computed', () => {
  it('should compute derived value', () => {
    const count = signal(1);
    const doubled = computed(() => count() * 2);
    expect(doubled()).toBe(2);
  });

  it('should update when dependency changes', () => {
    const count = signal(1);
    const doubled = computed(() => count() * 2);
    count(5);
    expect(doubled()).toBe(10);
  });

  it('should be read-only', () => {
    const count = signal(1);
    const doubled = computed(() => count() * 2);
    expect(() => doubled(10)).toThrow('Computed signals are read-only');
  });
});

describe('Effect', () => {
  it('should run immediately', () => {
    let ran = false;
    effect(() => { ran = true; });
    expect(ran).toBe(true);
  });

  it('should re-run when signal changes', async () => {
    const count = signal(0);
    let executions = 0;
    effect(() => { count(); executions++; });
    expect(executions).toBe(1);
    count(1);
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(executions).toBe(2);
  });

  it('should return cleanup function', () => {
    const count = signal(0);
    let executions = 0;
    const stop = effect(() => { count(); executions++; });
    stop();
    count(1);
    expect(executions).toBe(1); // Should not re-run after cleanup
  });
});

describe('Batch', () => {
  it('should batch multiple updates', async () => {
    const count = signal(0);
    let executions = 0;
    effect(() => { count(); executions++; });
    
    batch(() => {
      count(count() + 1);
      count(count() + 1);
      count(count() + 1);
    });
    
    expect(count()).toBe(3);
    expect(executions).toBe(2); // Initial + 1 batched
  });
});
