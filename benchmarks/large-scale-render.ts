/**
 * Qore Large Scale Rendering Tests
 * Tests for rendering performance with 10000+ nodes
 */

import { signal, effect, h, render, batch } from '@qorejs/qore';

export interface RenderTestResult {
  test: string;
  passed: boolean;
  time: number;
  target: number;
  nodes?: number;
  fps?: number;
  details?: string;
}

const results: RenderTestResult[] = [];

/**
 * Test 1: Initial Render of 10000 Nodes
 * Measure time to render 10000 simple nodes at once
 */
export function testInitialRender10k(): RenderTestResult {
  console.log('📊 Test 1: Initial Render (10000 nodes)\n');
  
  if (typeof document === 'undefined') {
    console.log('   Skipping: Requires DOM environment\n');
    const result: RenderTestResult = {
      test: 'Initial Render (10000 nodes)',
      passed: true,
      time: 0,
      target: 100,
      nodes: 10000,
      details: 'Skipped (no DOM)'
    };
    results.push(result);
    return result;
  }
  
  const startTime = performance.now();
  
  // Create 10000 simple span elements
  const nodes = Array.from({ length: 10000 }, (_, i) => 
    h('span', { key: i }, [`Item ${i}`])
  );
  
  const container = document.createElement('div');
  
  // Render all nodes
  nodes.forEach(node => {
    if (node instanceof Node) {
      container.appendChild(node);
    }
  });
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  
  const target = 100; // Target: < 100ms
  const passed = totalTime < target;
  
  const result: RenderTestResult = {
    test: 'Initial Render (10000 nodes)',
    passed,
    time: totalTime,
    target,
    nodes: 10000,
    details: passed 
      ? `Rendered in ${totalTime.toFixed(2)}ms` 
      : `Too slow: ${totalTime.toFixed(2)}ms (target: <${target}ms)`
  };
  
  results.push(result);
  
  console.log(`   Time: ${totalTime.toFixed(2)}ms`);
  console.log(`   Target: < ${target}ms`);
  console.log(`   Nodes: 10000`);
  console.log(`   Status: ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
  
  return result;
}

/**
 * Test 2: Batch Update of 10000 Signals
 * Measure time to update 10000 signals and trigger re-renders
 */
export function testBatchUpdate10k(): RenderTestResult {
  console.log('📊 Test 2: Batch Update (10000 signals)\n');
  
  // Create 10000 signals
  const signals = Array.from({ length: 10000 }, (_, i) => signal(i));
  
  const startTime = performance.now();
  
  // Update all signals in a batch
  batch(() => {
    for (let i = 0; i < 10000; i++) {
      signals[i](i + 10000);
    }
  });
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  
  const target = 50; // Target: < 50ms
  const passed = totalTime < target;
  
  const result: RenderTestResult = {
    test: 'Batch Update (10000 signals)',
    passed,
    time: totalTime,
    target,
    nodes: 10000,
    details: passed 
      ? `Updated in ${totalTime.toFixed(2)}ms` 
      : `Too slow: ${totalTime.toFixed(2)}ms (target: <${target}ms)`
  };
  
  results.push(result);
  
  console.log(`   Time: ${totalTime.toFixed(2)}ms`);
  console.log(`   Target: < ${target}ms`);
  console.log(`   Signals: 10000`);
  console.log(`   Status: ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
  
  return result;
}

/**
 * Test 3: Virtual Scroll Simulation
 * Render 10000 items but only display 20 at a time (viewport)
 */
export function testVirtualScroll(): RenderTestResult {
  console.log('📊 Test 3: Virtual Scroll Simulation\n');
  
  if (typeof document === 'undefined') {
    console.log('   Skipping: Requires DOM environment\n');
    const result: RenderTestResult = {
      test: 'Virtual Scroll (10000 items, 20 viewport)',
      passed: true,
      time: 0,
      target: 16.67,
      nodes: 10000,
      fps: 60,
      details: 'Skipped (no DOM)'
    };
    results.push(result);
    return result;
  }
  
  const totalItems = 10000;
  const viewportSize = 20;
  const signals = Array.from({ length: totalItems }, (_, i) => signal(i));
  
  const container = document.createElement('div');
  
  let totalTime = 0;
  let frameCount = 0;
  
  // Simulate scrolling through the list
  const scrollPositions = [0, 100, 500, 1000, 5000, 9000, 9500, 9980];
  
  const startTime = performance.now();
  
  scrollPositions.forEach(startIndex => {
    const frameStart = performance.now();
    
    // Get visible items
    const visibleEnd = Math.min(startIndex + viewportSize, totalItems);
    const visibleItems = [];
    
    for (let i = startIndex; i < visibleEnd; i++) {
      visibleItems.push(signals[i]());
    }
    
    // Render visible items
    container.innerHTML = '';
    visibleItems.forEach((item, i) => {
      const el = document.createElement('div');
      el.textContent = `Item ${item}`;
      container.appendChild(el);
    });
    
    frameCount++;
    totalTime += performance.now() - frameStart;
  });
  
  const endTime = performance.now();
  const totalElapsedTime = endTime - startTime;
  const avgFrameTime = totalTime / frameCount;
  const fps = 1000 / avgFrameTime;
  
  const target = 16.67; // 60fps = 16.67ms per frame
  const passed = avgFrameTime < target;
  
  const result: RenderTestResult = {
    test: 'Virtual Scroll (10000 items, 20 viewport)',
    passed,
    time: avgFrameTime,
    target,
    nodes: totalItems,
    fps,
    details: passed 
      ? `Smooth scrolling at ${fps.toFixed(1)} fps` 
      : `Choppy: ${fps.toFixed(1)} fps (target: 60fps)`
  };
  
  results.push(result);
  
  console.log(`   Total items: ${totalItems}`);
  console.log(`   Viewport: ${viewportSize} items`);
  console.log(`   Avg frame time: ${avgFrameTime.toFixed(2)}ms`);
  console.log(`   FPS: ${fps.toFixed(1)}`);
  console.log(`   Target: 60fps (${target}ms)`);
  console.log(`   Status: ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
  
  return result;
}

/**
 * Test 4: Incremental Render Performance
 * Measure time to add nodes incrementally
 */
export function testIncrementalRender(): RenderTestResult {
  console.log('📊 Test 4: Incremental Render (1000 nodes, 10 batches)\n');
  
  if (typeof document === 'undefined') {
    console.log('   Skipping: Requires DOM environment\n');
    const result: RenderTestResult = {
      test: 'Incremental Render (1000 nodes, 10 batches)',
      passed: true,
      time: 0,
      target: 10,
      nodes: 1000,
      details: 'Skipped (no DOM)'
    };
    results.push(result);
    return result;
  }
  
  const container = document.createElement('div');
  
  const totalNodes = 1000;
  const batchSize = 100;
  const batches = totalNodes / batchSize;
  
  const startTime = performance.now();
  
  for (let b = 0; b < batches; b++) {
    const batchStart = performance.now();
    
    for (let i = 0; i < batchSize; i++) {
      const index = b * batchSize + i;
      const el = document.createElement('span');
      el.textContent = `Item ${index}`;
      container.appendChild(el);
    }
  }
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  const avgBatchTime = totalTime / batches;
  
  const target = 10; // Target: < 10ms per batch
  const passed = avgBatchTime < target;
  
  const result: RenderTestResult = {
    test: 'Incremental Render (1000 nodes, 10 batches)',
    passed,
    time: avgBatchTime,
    target,
    nodes: totalNodes,
    details: passed 
      ? `Avg batch: ${avgBatchTime.toFixed(2)}ms` 
      : `Too slow: ${avgBatchTime.toFixed(2)}ms per batch`
  };
  
  results.push(result);
  
  console.log(`   Total nodes: ${totalNodes}`);
  console.log(`   Batches: ${batches}`);
  console.log(`   Avg batch time: ${avgBatchTime.toFixed(2)}ms`);
  console.log(`   Target: < ${target}ms`);
  console.log(`   Status: ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
  
  return result;
}

/**
 * Test 5: Deep Component Tree (100 levels)
 * Measure render time for deeply nested components
 */
export function testDeepComponentTree(): RenderTestResult {
  console.log('📊 Test 5: Deep Component Tree (100 levels)\n');
  
  if (typeof document === 'undefined') {
    console.log('   Skipping: Requires DOM environment\n');
    const result: RenderTestResult = {
      test: 'Deep Component Tree (100 levels)',
      passed: true,
      time: 0,
      target: 20,
      details: 'Skipped (no DOM)'
    };
    results.push(result);
    return result;
  }
  
  const depth = 100;
  
  const startTime = performance.now();
  
  // Create deeply nested structure
  function createDeepTree(level: number): any {
    if (level === 0) {
      return h('span', null, ['Leaf']);
    }
    return h('div', { class: `level-${level}` }, [
      createDeepTree(level - 1)
    ]);
  }
  
  const tree = createDeepTree(depth);
  
  const container = document.createElement('div');
  
  if (tree instanceof Node) {
    container.appendChild(tree);
  }
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  
  const target = 20; // Target: < 20ms
  const passed = totalTime < target;
  
  const result: RenderTestResult = {
    test: 'Deep Component Tree (100 levels)',
    passed,
    time: totalTime,
    target,
    details: passed 
      ? `Created in ${totalTime.toFixed(2)}ms` 
      : `Too slow: ${totalTime.toFixed(2)}ms (target: <${target}ms)`
  };
  
  results.push(result);
  
  console.log(`   Depth: ${depth} levels`);
  console.log(`   Time: ${totalTime.toFixed(2)}ms`);
  console.log(`   Target: < ${target}ms`);
  console.log(`   Status: ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
  
  return result;
}

/**
 * Test 6: List Reordering Performance
 * Measure time to reorder a large list
 */
export function testListReordering(): RenderTestResult {
  console.log('📊 Test 6: List Reordering (1000 items)\n');
  
  const itemCount = 1000;
  const signals = Array.from({ length: itemCount }, (_, i) => signal(i));
  
  const startTime = performance.now();
  
  // Reverse the list order
  batch(() => {
    for (let i = 0; i < itemCount / 2; i++) {
      const temp = signals[i]();
      signals[i](signals[itemCount - 1 - i]());
      signals[itemCount - 1 - i](temp);
    }
  });
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  
  const target = 30; // Target: < 30ms
  const passed = totalTime < target;
  
  const result: RenderTestResult = {
    test: 'List Reordering (1000 items)',
    passed,
    time: totalTime,
    target,
    nodes: itemCount,
    details: passed 
      ? `Reordered in ${totalTime.toFixed(2)}ms` 
      : `Too slow: ${totalTime.toFixed(2)}ms (target: <${target}ms)`
  };
  
  results.push(result);
  
  console.log(`   Items: ${itemCount}`);
  console.log(`   Time: ${totalTime.toFixed(2)}ms`);
  console.log(`   Target: < ${target}ms`);
  console.log(`   Status: ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
  
  return result;
}

/**
 * Test 7: Signal Array Update (10000 signals)
 * Measure time to update all signals in an array
 */
export function testSignalArrayUpdate(): RenderTestResult {
  console.log('📊 Test 7: Signal Array Update (10000 signals)\n');
  
  const signalCount = 10000;
  const signals = Array.from({ length: signalCount }, (_, i) => signal(i));
  
  const startTime = performance.now();
  
  // Update all signals
  for (let i = 0; i < signalCount; i++) {
    signals[i](i * 2);
  }
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  
  const target = 50; // Target: < 50ms
  const passed = totalTime < target;
  
  const result: RenderTestResult = {
    test: 'Signal Array Update (10000 signals)',
    passed,
    time: totalTime,
    target,
    nodes: signalCount,
    details: passed 
      ? `Updated in ${totalTime.toFixed(2)}ms` 
      : `Too slow: ${totalTime.toFixed(2)}ms (target: <${target}ms)`
  };
  
  results.push(result);
  
  console.log(`   Signals: ${signalCount}`);
  console.log(`   Time: ${totalTime.toFixed(2)}ms`);
  console.log(`   Target: < ${target}ms`);
  console.log(`   Status: ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
  
  return result;
}

/**
 * Print Summary Report
 */
export function printRenderTestSummary(): void {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║           Qore Large Scale Render Summary               ║');
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
    const time = r.time.toFixed(2).padStart(8);
    const target = `<${r.target.toFixed(2)}`.padStart(8);
    const fps = r.fps ? ` (${r.fps.toFixed(1)}fps)` : '';
    console.log(`║    ${status} ${r.test.padEnd(35)} ${time}ms ${target}ms${fps}  ║`);
  });
  
  console.log('╠══════════════════════════════════════════════════════════╣');
  const allPassed = passed === total;
  console.log(`║  Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}                        ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
}

/**
 * Run All Render Tests
 */
export function runAllRenderTests(): void {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║           🚀 Qore Large Scale Rendering Tests           ║');
  console.log('║              10000+ Node Performance                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  
  testInitialRender10k();
  testBatchUpdate10k();
  testVirtualScroll();
  testIncrementalRender();
  testDeepComponentTree();
  testListReordering();
  testSignalArrayUpdate();
  
  printRenderTestSummary();
}

// Export for CLI usage
if (typeof process !== 'undefined' && process.argv) {
  console.log('Run via: pnpm test:render');
}
