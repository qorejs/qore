/**
 * Qore Performance Benchmarks - New Architecture
 * Run with: pnpm bench
 */

import { signal, effect, batch, computed } from '@qore/core';

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║           🚀 Qore 2.0 Performance Benchmarks            ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

// Benchmark 1: Signal Operations
console.log('📊 Benchmark 1: Signal Operations (1000 signals)');
const signalStart = performance.now();
const signals = Array.from({ length: 1000 }, (_, i) => signal(i));
for (let i = 0; i < 1000; i++) signals[i](i + 1);
const signalTime = performance.now() - signalStart;
console.log(`   Time: ${signalTime.toFixed(2)}ms`);
console.log(`   Target: < 5ms | Status: ${signalTime < 5 ? '✅' : '⚠️'}\n`);

// Benchmark 2: Effect Tracking
console.log('📊 Benchmark 2: Effect Tracking (100 effects)');
const effectStart = performance.now();
const source = signal(0);
let effectCount = 0;
const cleanups = Array.from({ length: 100 }, () => {
  return effect(() => { source(); effectCount++; });
});
source(1);
setTimeout(() => {
  const effectTime = performance.now() - effectStart;
  console.log(`   Time: ${effectTime.toFixed(2)}ms (${effectCount} executions)`);
  console.log(`   Target: < 10ms | Status: ${effectTime < 10 ? '✅' : '⚠️'}\n`);
  
  // Cleanup
  cleanups.forEach(fn => fn());
  
  // Benchmark 3: Computed Chain
  console.log('📊 Benchmark 3: Computed Chain');
  const computedStart = performance.now();
  const base = signal(1);
  const c1 = computed(() => base() * 2);
  const c2 = computed(() => c1() * 2);
  const c3 = computed(() => c2() * 2);
  const c4 = computed(() => c3() * 2);
  const c5 = computed(() => c4() * 2);
  
  base(2);
  const result = c5();
  const computedTime = performance.now() - computedStart;
  console.log(`   Time: ${computedTime.toFixed(2)}ms (result: ${result})`);
  console.log(`   Expected: 64 (2 * 2^5) | Status: ${result === 64 ? '✅' : '❌'}\n`);
  
  // Benchmark 4: Batch Updates
  console.log('📊 Benchmark 4: Batch Updates (100 updates)');
  const batchStart = performance.now();
  const batched = signal(0);
  let batchExecutions = 0;
  effect(() => { batched(); batchExecutions++; });
  
  batch(() => {
    for (let i = 0; i < 100; i++) {
      batched(batched() + 1);
    }
  });
  const batchTime = performance.now() - batchStart;
  console.log(`   Time: ${batchTime.toFixed(2)}ms (${batchExecutions} effect runs)`);
  console.log(`   Expected: 2 runs (initial + 1 batched) | Status: ${batchExecutions === 2 ? '✅' : '❌'}\n`);
  
  // Benchmark 5: Large Scale
  console.log('📊 Benchmark 5: Large Scale (1000 signals + effects)');
  const largeStart = performance.now();
  const largeSignals = Array.from({ length: 100 }, () => signal(0));
  let largeCount = 0;
  
  Array.from({ length: 100 }, (_, i) => {
    effect(() => {
      largeSignals[i]();
      largeCount++;
    });
  });
  
  batch(() => {
    for (let i = 0; i < 100; i++) {
      largeSignals[i](i + 1);
    }
  });
  const largeTime = performance.now() - largeStart;
  console.log(`   Time: ${largeTime.toFixed(2)}ms (${largeCount} effect executions)`);
  console.log(`   Target: < 50ms | Status: ${largeTime < 50 ? '✅' : '⚠️'}\n`);
  
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║              ✅ All benchmarks completed!               ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  // Summary
  const allPassed = signalTime < 5 && effectTime < 10 && result === 32 && batchExecutions === 2 && largeTime < 50;
  console.log(`Overall Status: ${allPassed ? '✅ ALL PASSED' : '⚠️ SOME FAILED'}\n`);
  
  console.log('Key Metrics:');
  console.log(`  • Signal ops: ${signalTime.toFixed(2)}ms (1000 signals)`);
  console.log(`  • Effect tracking: ${effectTime.toFixed(2)}ms (100 effects)`);
  console.log(`  • Computed chain: ${computedTime.toFixed(2)}ms (5 levels)`);
  console.log(`  • Batch updates: ${batchTime.toFixed(2)}ms (100 updates, ${batchExecutions} runs)`);
  console.log(`  • Large scale: ${largeTime.toFixed(2)}ms (100 signals + 100 effects)\n`);
}, 10);
