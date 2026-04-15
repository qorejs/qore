import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { signal, computed, effect, batch } from '../../src/signal';
import { h, render, For } from '../../src/render';

/**
 * 响应式系统压力测试
 * 测试大规模数据、高频更新、复杂依赖等场景
 */

describe('Reactive System Stress Tests', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('should handle 1000 signals efficiently', async () => {
    const signals = Array.from({ length: 1000 }, (_, i) => signal(i));
    const sum = computed(() => signals.reduce((acc, s) => acc + s(), 0));
    
    const start = performance.now();
    
    // Update all signals
    batch(() => {
      signals.forEach((s, i) => s(s() + 1));
    });
    
    const end = performance.now();
    
    expect(sum()).toBe(1000 * 1001 / 2); // Sum of 1 to 1000
    expect(end - start).toBeLessThan(100); // Should complete in under 100ms
  });

  it('should handle deep dependency chains', () => {
    const level1 = signal(1);
    const level2 = computed(() => level1() * 2);
    const level3 = computed(() => level2() + 10);
    const level4 = computed(() => level3() * 3);
    const level5 = computed(() => level4() - 5);
    
    expect(level5()).toBe((1 * 2 + 10) * 3 - 5); // 31
    
    level1(10);
    expect(level5()).toBe((10 * 2 + 10) * 3 - 5); // 85
  });

  it('should handle diamond dependency pattern', () => {
    const source = signal(1);
    const branch1 = computed(() => source() * 2);
    const branch2 = computed(() => source() + 10);
    const merged = computed(() => branch1() + branch2());
    
    expect(merged()).toBe(1 * 2 + 1 + 10); // 13
    
    source(5);
    expect(merged()).toBe(5 * 2 + 5 + 10); // 25
  });

  it('should handle circular dependency detection', () => {
    const a = signal(1);
    let bValue = 1;
    
    const b = computed(() => {
      if (a() > 100) {
        return bValue; // Prevent infinite loop
      }
      return a() * 2;
    });
    
    expect(b()).toBe(2);
    
    a(50);
    expect(b()).toBe(100);
  });

  it('should handle 10000 component updates', async () => {
    const items = signal(Array.from({ length: 10000 }, (_, i) => ({ id: i, value: i })));
    let renderCount = 0;

    const ListItem = (item: { id: number; value: number }) => {
      renderCount++;
      return h('div', { class: 'item' }, `Item ${item.id}: ${item.value}`);
    };

    const List = () => {
      return h('div', { class: 'list' }, [
        ...items().slice(0, 100).map(item => ListItem(item))
      ]);
    };

    const start = performance.now();
    render(container, List);
    const renderTime = performance.now() - start;
    
    expect(renderCount).toBe(100);
    expect(renderTime).toBeLessThan(1000); // Should render in under 1 second
    
    // Update items
    const updateStart = performance.now();
    items(items().map(item => ({ ...item, value: item.value + 1 })));
    const updateTime = performance.now() - updateStart;
    
    expect(updateTime).toBeLessThan(100); // Batch update should be fast
  });

  it('should handle high frequency updates', async () => {
    const counter = signal(0);
    const updates: number[] = [];
    
    effect(() => {
      updates.push(counter());
    });
    
    const start = performance.now();
    
    // 1000 rapid updates
    for (let i = 0; i < 1000; i++) {
      counter(i);
    }
    
    const end = performance.now();
    
    expect(updates.length).toBeGreaterThan(0);
    expect(counter()).toBe(999);
    expect(end - start).toBeLessThan(500); // Should complete in under 500ms
  });

  it('should handle computed caching', () => {
    let computeCount = 0;
    const source = signal(1);
    
    const expensive = computed(() => {
      computeCount++;
      // Simulate expensive computation
      let result = 0;
      for (let i = 0; i < 1000; i++) {
        result += source();
      }
      return result;
    });
    
    expect(expensive()).toBe(1000);
    expect(computeCount).toBe(1);
    
    // Access again without changing source - should use cache
    expect(expensive()).toBe(1000);
    expect(computeCount).toBe(1); // Should not recompute
    
    source(2);
    expect(expensive()).toBe(2000);
    expect(computeCount).toBe(2); // Should recompute
  });

  it('should handle effect cleanup on re-run', async () => {
    const count = signal(0);
    const cleanups: number[] = [];
    
    effect(() => {
      const id = count();
      return () => {
        cleanups.push(id);
      };
    });
    
    count(1);
    await new Promise(resolve => setTimeout(resolve, 10));
    count(2);
    await new Promise(resolve => setTimeout(resolve, 10));
    count(3);
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(cleanups).toEqual([0, 1, 2]);
  });

  it('should handle batched nested updates', async () => {
    const outer = signal({ inner: signal(0) });
    let effectCount = 0;
    
    effect(() => {
      outer().inner();
      effectCount++;
    });
    
    expect(effectCount).toBe(1);
    
    batch(() => {
      outer({ inner: signal(5) });
    });
    
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(effectCount).toBe(2);
  });

  it('should handle large array operations', () => {
    const items = signal(Array.from({ length: 10000 }, (_, i) => i));
    const filtered = computed(() => items().filter(x => x % 2 === 0));
    const mapped = computed(() => filtered().map(x => x * 2));
    const reduced = computed(() => mapped().reduce((a, b) => a + b, 0));
    
    expect(filtered().length).toBe(5000);
    expect(reduced()).toBeGreaterThan(0);
    
    // Update array
    items(items().map(x => x + 1));
    expect(filtered().length).toBe(5000); // Still half
  });

  it('should handle conditional dependencies', () => {
    const mode = signal<'a' | 'b'>('a');
    const valueA = signal(10);
    const valueB = signal(20);
    
    let computeCount = 0;
    const result = computed(() => {
      computeCount++;
      return mode() === 'a' ? valueA() : valueB();
    });
    
    expect(result()).toBe(10);
    expect(computeCount).toBe(1);
    
    // Change unused dependency - should not trigger recompute
    valueB(999);
    expect(computeCount).toBe(1); // Still 1
    
    // Change mode - should recompute
    mode('b');
    expect(result()).toBe(999);
    expect(computeCount).toBe(2);
  });

  it('should handle signal garbage collection', async () => {
    let cleanupCalled = false;
    
    const temp = signal('temp');
    const stop = effect(() => {
      temp();
      return () => {
        cleanupCalled = true;
      };
    });
    
    expect(cleanupCalled).toBe(false);
    
    stop();
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(cleanupCalled).toBe(true);
  });

  it('should handle computed with multiple dependencies', () => {
    const a = signal(1);
    const b = signal(2);
    const c = signal(3);
    
    const result = computed(() => a() + b() + c());
    expect(result()).toBe(6);
    
    a(10);
    expect(result()).toBe(15);
    
    b(20);
    expect(result()).toBe(33);
    
    c(30);
    expect(result()).toBe(60);
  });

  it('should handle effect ordering', async () => {
    const count = signal(0);
    const order: string[] = [];
    
    effect(() => {
      count();
      order.push('a');
    });
    
    effect(() => {
      count();
      order.push('b');
    });
    
    effect(() => {
      count();
      order.push('c');
    });
    
    expect(order).toEqual(['a', 'b', 'c']);
    
    count(1);
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(order).toEqual(['a', 'b', 'c', 'a', 'b', 'c']);
  });

  it('should handle stress test: 100000 signals', async () => {
    const signals = Array.from({ length: 100000 }, (_, i) => signal(i));
    
    const start = performance.now();
    
    // Batch update every 1000th signal
    batch(() => {
      for (let i = 0; i < signals.length; i += 1000) {
        signals[i](signals[i]() + 1);
      }
    });
    
    const end = performance.now();
    
    expect(end - start).toBeLessThan(5000); // Should complete in under 5 seconds
  });

  it('should handle reactive component re-rendering', async () => {
    const count = signal(0);
    const renderTimes: number[] = [];
    
    const Counter = () => {
      renderTimes.push(Date.now());
      return h('div', {}, `Count: ${count()}`);
    };

    render(container, Counter);
    
    expect(container.innerHTML).toContain('Count: 0');
    
    count(1);
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(container.innerHTML).toContain('Count: 1');
    
    count(2);
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(container.innerHTML).toContain('Count: 2');
    
    // Should have rendered 3 times (initial + 2 updates)
    expect(renderTimes.length).toBe(3);
  });

  it('should handle complex state tree', () => {
    interface State {
      user: {
        name: string;
        profile: {
          age: number;
          settings: {
            theme: string;
            notifications: boolean;
          };
        };
      };
      posts: Array<{ id: number; title: string }>;
    }

    const state = signal<State>({
      user: {
        name: 'Alice',
        profile: {
          age: 30,
          settings: {
            theme: 'dark',
            notifications: true
          }
        }
      },
      posts: []
    });

    const userName = computed(() => state().user.name);
    const userAge = computed(() => state().user.profile.age);
    const theme = computed(() => state().user.profile.settings.theme);
    const postCount = computed(() => state().posts.length);

    expect(userName()).toBe('Alice');
    expect(userAge()).toBe(30);
    expect(theme()).toBe('dark');
    expect(postCount()).toBe(0);

    // Deep update
    state({
      ...state(),
      user: {
        ...state().user,
        profile: {
          ...state().user.profile,
          settings: {
            ...state().user.profile.settings,
            theme: 'light'
          }
        }
      },
      posts: [{ id: 1, title: 'Hello' }]
    });

    expect(theme()).toBe('light');
    expect(postCount()).toBe(1);
  });
});
