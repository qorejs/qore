import { describe, it, expect } from 'vitest';
import { signal, computed, effect } from '../src/reactive';

describe('Signal', () => {
  it('should create signal with initial value', () => {
    const count = signal(0);
    expect(count.get()).toBe(0);
  });

  it('should update value', () => {
    const count = signal(0);
    count.set(5);
    expect(count.get()).toBe(5);
  });
});

describe('Computed', () => {
  it('should compute derived value', () => {
    const count = signal(1);
    const doubled = computed(() => count.get() * 2);
    expect(doubled.get()).toBe(2);
  });

  it('should update when dependency changes', () => {
    const count = signal(1);
    const doubled = computed(() => count.get() * 2);
    count.set(5);
    expect(doubled.get()).toBe(10);
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
    effect(() => { count.get(); executions++; });
    expect(executions).toBe(1);
    count.set(1);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(executions).toBe(2);
  });
});
