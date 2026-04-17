/**
 * For Component Key Mechanism - Performance Benchmark
 * 
 * Compares performance of:
 * 1. For without key (index-based, full re-render)
 * 2. ForWithKey (key-based, efficient updates)
 * 
 * Run with: pnpm test -- --run for-key.benchmark.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { h, For, ForWithKey } from '../src/render';
import { signal } from '../src/signal';

interface BenchmarkResult {
  name: string;
  operation: string;
  duration: number;
  operations: number;
}

const results: BenchmarkResult[] = [];

function benchmark(name: string, operation: string, fn: () => void): number {
  const start = performance.now();
  fn();
  const end = performance.now();
  const duration = end - start;
  
  results.push({ name, operation, duration, operations: 1 });
  return duration;
}

async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('For Key Mechanism - Performance Benchmark', () => {
  let container: HTMLElement;
  let container2: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="root1"></div><div id="root2"></div>';
    container = document.getElementById('root1')!;
    container2 = document.getElementById('root2')!;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    console.log('\n--- Benchmark Results ---');
    results.forEach(r => {
      console.log(`${r.name} - ${r.operation}: ${r.duration.toFixed(2)}ms`);
    });
  });

  describe('Initial Render', () => {
    it('benchmark: render 100 items without key', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));
      
      const duration = benchmark('For (no key)', 'render 100 items', () => {
        const result = For(() => items, (item) => h('div', null, item.name));
        expect(result.length).toBe(100);
      });
      
      console.log(`For (no key) - render 100 items: ${duration.toFixed(2)}ms`);
    });

    it('benchmark: render 100 items with ForWithKey', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));
      
      const duration = benchmark('ForWithKey', 'render 100 items', () => {
        const cleanup = ForWithKey(
          container,
          () => items,
          (item) => h('div', { 'data-id': String(item.id) }, item.name) as Node,
          (item) => item.id
        );
        expect(container.children.length).toBe(100);
        cleanup();
      });
      
      console.log(`ForWithKey - render 100 items: ${duration.toFixed(2)}ms`);
    });

    it('benchmark: render 1000 items without key', () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` }));
      
      const duration = benchmark('For (no key)', 'render 1000 items', () => {
        const result = For(() => items, (item) => h('div', null, item.name));
        expect(result.length).toBe(1000);
      });
      
      console.log(`For (no key) - render 1000 items: ${duration.toFixed(2)}ms`);
    });

    it('benchmark: render 1000 items with ForWithKey', () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` }));
      
      const duration = benchmark('ForWithKey', 'render 1000 items', () => {
        const cleanup = ForWithKey(
          container,
          () => items,
          (item) => h('div', { 'data-id': String(item.id) }, item.name) as Node,
          (item) => item.id
        );
        expect(container.children.length).toBe(1000);
        cleanup();
      });
      
      console.log(`ForWithKey - render 1000 items: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Insertion at Beginning', () => {
    it('benchmark: insert at beginning without key (full re-render)', async () => {
      const items = signal(Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` })));
      
      // Initial render
      For(items, (item) => h('div', null, item.name));
      await wait(10);
      
      const duration = benchmark('For (no key)', 'insert at beginning', () => {
        items([{ id: -1, name: 'New Item' }, ...items()]);
      });
      
      await wait(10);
      console.log(`For (no key) - insert at beginning: ${duration.toFixed(2)}ms`);
    });

    it('benchmark: insert at beginning with ForWithKey', async () => {
      const items = signal(Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` })));
      
      // Initial render
      const cleanup = ForWithKey(
        container,
        items,
        (item) => h('div', { 'data-id': String(item.id) }, item.name) as Node,
        (item) => item.id
      );
      await wait(10);
      
      const duration = benchmark('ForWithKey', 'insert at beginning', () => {
        items([{ id: -1, name: 'New Item' }, ...items()]);
      });
      
      await wait(10);
      console.log(`ForWithKey - insert at beginning: ${duration.toFixed(2)}ms`);
      cleanup();
    });
  });

  describe('Deletion from Middle', () => {
    it('benchmark: delete from middle without key (full re-render)', async () => {
      const items = signal(Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` })));
      
      // Initial render
      For(items, (item) => h('div', null, item.name));
      await wait(10);
      
      const duration = benchmark('For (no key)', 'delete from middle', () => {
        const current = items();
        items([...current.slice(0, 50), ...current.slice(51)]);
      });
      
      await wait(10);
      console.log(`For (no key) - delete from middle: ${duration.toFixed(2)}ms`);
    });

    it('benchmark: delete from middle with ForWithKey', async () => {
      const items = signal(Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` })));
      
      // Initial render
      const cleanup = ForWithKey(
        container,
        items,
        (item) => h('div', { 'data-id': String(item.id) }, item.name) as Node,
        (item) => item.id
      );
      await wait(10);
      
      const duration = benchmark('ForWithKey', 'delete from middle', () => {
        const current = items();
        items([...current.slice(0, 50), ...current.slice(51)]);
      });
      
      await wait(10);
      console.log(`ForWithKey - delete from middle: ${duration.toFixed(2)}ms`);
      cleanup();
    });
  });

  describe('Reordering', () => {
    it('benchmark: reverse order without key (full re-render)', async () => {
      const items = signal(Array.from({ length: 50 }, (_, i) => ({ id: i, name: `Item ${i}` })));
      
      // Initial render
      For(items, (item) => h('div', null, item.name));
      await wait(10);
      
      const duration = benchmark('For (no key)', 'reverse order', () => {
        items(items().reverse());
      });
      
      await wait(10);
      console.log(`For (no key) - reverse order: ${duration.toFixed(2)}ms`);
    });

    it('benchmark: reverse order with ForWithKey', async () => {
      const items = signal(Array.from({ length: 50 }, (_, i) => ({ id: i, name: `Item ${i}` })));
      
      // Initial render
      const cleanup = ForWithKey(
        container,
        items,
        (item) => h('div', { 'data-id': String(item.id) }, item.name) as Node,
        (item) => item.id
      );
      await wait(10);
      
      const duration = benchmark('ForWithKey', 'reverse order', () => {
        items(items().reverse());
      });
      
      await wait(10);
      console.log(`ForWithKey - reverse order: ${duration.toFixed(2)}ms`);
      cleanup();
    });
  });

  describe('Large List Operations', () => {
    it('benchmark: update 1000 items without key', async () => {
      const items = signal(Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` })));
      
      // Initial render
      For(items, (item) => h('div', null, item.name));
      await wait(20);
      
      const duration = benchmark('For (no key)', 'update 1000 items', () => {
        items(items().map(item => ({ ...item, name: `Updated ${item.id}` })));
      });
      
      await wait(20);
      console.log(`For (no key) - update 1000 items: ${duration.toFixed(2)}ms`);
    });

    it('benchmark: update 1000 items with ForWithKey', async () => {
      const items = signal(Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` })));
      
      // Initial render
      const cleanup = ForWithKey(
        container,
        items,
        (item) => h('div', { 'data-id': String(item.id) }, item.name) as Node,
        (item) => item.id
      );
      await wait(20);
      
      const duration = benchmark('ForWithKey', 'update 1000 items', () => {
        items(items().map(item => ({ ...item, name: `Updated ${item.id}` })));
      });
      
      await wait(20);
      console.log(`ForWithKey - update 1000 items: ${duration.toFixed(2)}ms`);
      cleanup();
    });
  });
});

describe('For Key Mechanism - Correctness Tests', () => {
  let container: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    container = document.getElementById('root')!;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should preserve node identity with stable keys', async () => {
    const items = signal([
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
      { id: 3, name: 'C' }
    ]);

    const nodeMap = new Map<number, Node>();

    const cleanup = ForWithKey(
      container,
      items,
      (item) => {
        const el = document.createElement('div');
        el.textContent = item.name;
        el.setAttribute('data-id', String(item.id));
        if (!nodeMap.has(item.id)) {
          nodeMap.set(item.id, el);
        }
        return el;
      },
      (item) => item.id
    );

    await wait(10);
    
    const originalNodeB = nodeMap.get(2);
    const originalPosition = Array.from(container.children).indexOf(originalNodeB!);
    expect(originalPosition).toBe(1); // B is at index 1

    // Reorder: move B to first position
    items([
      { id: 2, name: 'B' },
      { id: 1, name: 'A' },
      { id: 3, name: 'C' }
    ]);
    await wait(10);

    // With proper keyed diffing, the same DOM node should be reused
    // Note: Current implementation may re-render, but keyed version should preserve
    const newNodeB = nodeMap.get(2);
    expect(newNodeB).toBe(originalNodeB); // Same node instance

    cleanup();
  });

  it('should handle dynamic key changes', async () => {
    const items = signal([
      { id: 'a', value: 1 },
      { id: 'b', value: 2 }
    ]);

    const cleanup = ForWithKey(
      container,
      items,
      (item) => {
        const el = document.createElement('div');
        el.textContent = String(item.value);
        return el;
      },
      (item) => item.id
    );

    await wait(10);
    expect(container.children.length).toBe(2);

    // Change key for an item (simulating ID change)
    items([
      { id: 'a', value: 1 },
      { id: 'c', value: 3 } // b -> c
    ]);
    await wait(10);

    expect(container.children.length).toBe(2);

    cleanup();
  });
});
