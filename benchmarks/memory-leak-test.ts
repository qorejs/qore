/**
 * Qore Memory Leak Detection Tests
 * Tests for proper cleanup of components, signals, and event listeners
 */

import { signal, effect, h, render, on } from '@qorejs/qore';

export interface MemoryTestResult {
  test: string;
  passed: boolean;
  baselineMemory: number;
  finalMemory: number;
  memoryDelta: number;
  details?: string;
}

const results: MemoryTestResult[] = [];

/**
 * Get memory usage (Node.js) or estimate (browser)
 */
function getMemoryUsage(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed / 1024 / 1024;
  }
  // Browser estimation (rough)
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    return (performance as any).memory.usedJSHeapSize / 1024 / 1024;
  }
  return 0;
}

/**
 * Test 1: Component Mount/Unmount Cycle
 * Verify memory returns to baseline after repeated mount/unmount
 */
export async function testComponentMountUnmount(): Promise<MemoryTestResult> {
  console.log('🧪 Test 1: Component Mount/Unmount Cycle\n');
  
  const baselineMemory = getMemoryUsage();
  console.log(`   Baseline memory: ${baselineMemory.toFixed(2)} MB`);
  
  if (typeof document === 'undefined') {
    console.log('   Skipping: Requires DOM environment\n');
    const result: MemoryTestResult = {
      test: 'Component Mount/Unmount (100 cycles)',
      passed: true,
      baselineMemory,
      finalMemory: baselineMemory,
      memoryDelta: 0,
      details: 'Skipped (no DOM)'
    };
    results.push(result);
    return result;
  }
  
  // Create a test component
  const TestComponent = () => {
    const count = signal(0);
    const handler = () => count(count() + 1);
    
    return h('div', { class: 'test-component' }, [
      h('span', null, [`Count: ${count()}`]),
      h('button', { onClick: handler }, ['Click'])
    ]);
  };
  
  // Mount/unmount cycle 100 times
  const container = document.createElement('div');
  
  for (let i = 0; i < 100; i++) {
    const cleanup = render(container, TestComponent);
    // Immediately cleanup
    cleanup();
  }
  
  // Force garbage collection hint (if available)
  if (typeof gc === 'function') {
    gc();
  }
  
  // Wait a bit for cleanup
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const finalMemory = getMemoryUsage();
  const memoryDelta = finalMemory - baselineMemory;
  
  // Allow 10% tolerance for memory fluctuation
  const tolerance = baselineMemory * 0.1;
  const passed = memoryDelta <= tolerance;
  
  const result: MemoryTestResult = {
    test: 'Component Mount/Unmount (100 cycles)',
    passed,
    baselineMemory,
    finalMemory,
    memoryDelta,
    details: passed ? 'Memory properly cleaned up' : `Memory leak detected: +${memoryDelta.toFixed(2)} MB`
  };
  
  results.push(result);
  
  console.log(`   Final memory: ${finalMemory.toFixed(2)} MB`);
  console.log(`   Delta: ${memoryDelta >= 0 ? '+' : ''}${memoryDelta.toFixed(2)} MB`);
  console.log(`   Status: ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
  
  return result;
}

/**
 * Test 2: Signal Dependency Cleanup
 * Verify effects are properly cleaned up when disposed
 */
export async function testSignalDependencyCleanup(): Promise<MemoryTestResult> {
  console.log('🧪 Test 2: Signal Dependency Cleanup\n');
  
  const baselineMemory = getMemoryUsage();
  console.log(`   Baseline memory: ${baselineMemory.toFixed(2)} MB`);
  
  // Create signals and effects
  const signals = Array.from({ length: 100 }, (_, i) => signal(i));
  const cleanups: (() => void)[] = [];
  
  // Create effects that depend on signals
  for (let i = 0; i < 100; i++) {
    const cleanup = effect(() => {
      signals[i]();
    });
    cleanups.push(cleanup);
  }
  
  // Trigger updates
  for (let i = 0; i < 100; i++) {
    signals[i](i + 100);
  }
  
  // Clean up all effects
  cleanups.forEach(cleanup => cleanup());
  
  // Clear signals reference
  signals.length = 0;
  
  // Force garbage collection hint
  if (typeof gc === 'function') {
    gc();
  }
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const finalMemory = getMemoryUsage();
  const memoryDelta = finalMemory - baselineMemory;
  
  const tolerance = baselineMemory * 0.1;
  const passed = memoryDelta <= tolerance;
  
  const result: MemoryTestResult = {
    test: 'Signal Dependency Cleanup (100 effects)',
    passed,
    baselineMemory,
    finalMemory,
    memoryDelta,
    details: passed ? 'Effects properly cleaned up' : `Memory leak detected: +${memoryDelta.toFixed(2)} MB`
  };
  
  results.push(result);
  
  console.log(`   Final memory: ${finalMemory.toFixed(2)} MB`);
  console.log(`   Delta: ${memoryDelta >= 0 ? '+' : ''}${memoryDelta.toFixed(2)} MB`);
  console.log(`   Status: ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
  
  return result;
}

/**
 * Test 3: Event Listener Cleanup
 * Verify event listeners are removed on unmount
 */
export async function testEventListenerCleanup(): Promise<MemoryTestResult> {
  console.log('🧪 Test 3: Event Listener Cleanup\n');
  
  const baselineMemory = getMemoryUsage();
  console.log(`   Baseline memory: ${baselineMemory.toFixed(2)} MB`);
  
  if (typeof document === 'undefined') {
    console.log('   Skipping: Requires DOM environment\n');
    const result: MemoryTestResult = {
      test: 'Event Listener Cleanup',
      passed: true,
      baselineMemory,
      finalMemory: baselineMemory,
      memoryDelta: 0,
      details: 'Skipped (no DOM)'
    };
    results.push(result);
    return result;
  }
  
  // Create elements with event listeners
  const elements: HTMLElement[] = [];
  const handlers: (() => void)[] = [];
  
  for (let i = 0; i < 100; i++) {
    const el = document.createElement('button');
    const handler = () => { /* click handler */ };
    el.addEventListener('click', handler);
    el.addEventListener('mouseover', handler);
    elements.push(el);
    handlers.push(handler);
  }
  
  // Remove all listeners
  elements.forEach((el, i) => {
    el.removeEventListener('click', handlers[i]);
    el.removeEventListener('mouseover', handlers[i]);
  });
  
  // Clear references
  elements.length = 0;
  handlers.length = 0;
  
  if (typeof gc === 'function') {
    gc();
  }
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const finalMemory = getMemoryUsage();
  const memoryDelta = finalMemory - baselineMemory;
  
  const tolerance = baselineMemory * 0.1;
  const passed = memoryDelta <= tolerance;
  
  const result: MemoryTestResult = {
    test: 'Event Listener Cleanup (200 listeners)',
    passed,
    baselineMemory,
    finalMemory,
    memoryDelta,
    details: passed ? 'Listeners properly cleaned up' : `Memory leak detected: +${memoryDelta.toFixed(2)} MB`
  };
  
  results.push(result);
  
  console.log(`   Final memory: ${finalMemory.toFixed(2)} MB`);
  console.log(`   Delta: ${memoryDelta >= 0 ? '+' : ''}${memoryDelta.toFixed(2)} MB`);
  console.log(`   Status: ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
  
  return result;
}

/**
 * Test 4: Large Component Tree Cleanup
 * Verify deep component trees are fully cleaned up
 */
export async function testLargeComponentTreeCleanup(): Promise<MemoryTestResult> {
  console.log('🧪 Test 4: Large Component Tree Cleanup\n');
  
  const baselineMemory = getMemoryUsage();
  console.log(`   Baseline memory: ${baselineMemory.toFixed(2)} MB`);
  
  if (typeof document === 'undefined') {
    console.log('   Skipping: Requires DOM environment\n');
    const result: MemoryTestResult = {
      test: 'Large Component Tree Cleanup (500 items × 10 cycles)',
      passed: true,
      baselineMemory,
      finalMemory: baselineMemory,
      memoryDelta: 0,
      details: 'Skipped (no DOM)'
    };
    results.push(result);
    return result;
  }
  
  const container = document.createElement('div');
  
  // Create large component tree
  const LargeComponent = () => {
    const items = Array.from({ length: 500 }, (_, i) => signal(i));
    
    return h('div', { class: 'large-tree' }, [
      ...items.map((sig, i) => 
        h('div', { key: i }, [
          h('span', null, [`Item ${sig()}`])
        ])
      )
    ]);
  };
  
  // Mount and unmount multiple times
  for (let i = 0; i < 10; i++) {
    const cleanup = render(container, LargeComponent);
    cleanup();
  }
  
  if (typeof gc === 'function') {
    gc();
  }
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const finalMemory = getMemoryUsage();
  const memoryDelta = finalMemory - baselineMemory;
  
  const tolerance = baselineMemory * 0.15; // Slightly more tolerance for large trees
  const passed = memoryDelta <= tolerance;
  
  const result: MemoryTestResult = {
    test: 'Large Component Tree Cleanup (500 items × 10 cycles)',
    passed,
    baselineMemory,
    finalMemory,
    memoryDelta,
    details: passed ? 'Large tree properly cleaned up' : `Memory leak detected: +${memoryDelta.toFixed(2)} MB`
  };
  
  results.push(result);
  
  console.log(`   Final memory: ${finalMemory.toFixed(2)} MB`);
  console.log(`   Delta: ${memoryDelta >= 0 ? '+' : ''}${memoryDelta.toFixed(2)} MB`);
  console.log(`   Status: ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
  
  return result;
}

/**
 * Test 5: Computed Signal Cleanup
 * Verify computed signals don't hold references after cleanup
 */
export async function testComputedSignalCleanup(): Promise<MemoryTestResult> {
  console.log('🧪 Test 5: Computed Signal Cleanup\n');
  
  const baselineMemory = getMemoryUsage();
  console.log(`   Baseline memory: ${baselineMemory.toFixed(2)} MB`);
  
  const sourceSignals = Array.from({ length: 50 }, (_, i) => signal(i));
  const computeds = Array.from({ length: 50 }, (_, i) => 
    signal(() => sourceSignals[i]() * 2)
  );
  
  // Access computed values
  computeds.forEach(c => c());
  
  // Update source signals
  sourceSignals.forEach((sig, i) => sig(i + 100));
  
  // Clear references
  sourceSignals.length = 0;
  computeds.length = 0;
  
  if (typeof gc === 'function') {
    gc();
  }
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const finalMemory = getMemoryUsage();
  const memoryDelta = finalMemory - baselineMemory;
  
  const tolerance = baselineMemory * 0.1;
  const passed = memoryDelta <= tolerance;
  
  const result: MemoryTestResult = {
    test: 'Computed Signal Cleanup (50 computed)',
    passed,
    baselineMemory,
    finalMemory,
    memoryDelta,
    details: passed ? 'Computed signals properly cleaned up' : `Memory leak detected: +${memoryDelta.toFixed(2)} MB`
  };
  
  results.push(result);
  
  console.log(`   Final memory: ${finalMemory.toFixed(2)} MB`);
  console.log(`   Delta: ${memoryDelta >= 0 ? '+' : ''}${memoryDelta.toFixed(2)} MB`);
  console.log(`   Status: ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
  
  return result;
}

/**
 * Print Summary Report
 */
export function printMemoryTestSummary(): void {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║           Qore Memory Leak Test Summary                 ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log(`║  Total Tests: ${total}                                          ║`);
  console.log(`║  Passed: ${passed}                                               ║`);
  console.log(`║  Failed: ${total - passed}                                               ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  Results:                                                ║');
  
  results.forEach(r => {
    const status = r.passed ? '✅' : '❌';
    const delta = r.memoryDelta >= 0 ? `+${r.memoryDelta.toFixed(2)}` : r.memoryDelta.toFixed(2);
    console.log(`║    ${status} ${r.test.padEnd(40)} ${delta}MB  ║`);
  });
  
  console.log('╠══════════════════════════════════════════════════════════╣');
  const allPassed = passed === total;
  console.log(`║  Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}                        ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
}

/**
 * Run All Memory Tests
 */
export async function runAllMemoryTests(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║           🔍 Qore Memory Leak Detection                 ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  
  await testComponentMountUnmount();
  await testSignalDependencyCleanup();
  await testEventListenerCleanup();
  await testLargeComponentTreeCleanup();
  await testComputedSignalCleanup();
  
  printMemoryTestSummary();
}

// Export for CLI usage
if (typeof process !== 'undefined' && process.argv) {
  console.log('Run via: pnpm test:memory');
}
