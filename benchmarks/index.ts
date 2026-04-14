/**
 * Qore Performance Benchmarks
 * Comprehensive benchmark suite
 */

import { signal, effect, h, diff, createStream } from '@qore/core';

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║           🚀 Qore Performance Benchmarks                ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

// Benchmark 1: Signal Operations
console.log('📊 Benchmark 1: Signal Operations');
const signalStart = performance.now();
const signals = Array.from({ length: 1000 }, (_, i) => signal(i));
for (let i = 0; i < 1000; i++) signals[i].set(i + 1);
const signalTime = performance.now() - signalStart;
console.log(`   1000 signals created/updated: ${signalTime.toFixed(2)}ms`);
console.log(`   Target: < 5ms | Status: ${signalTime < 5 ? '✅' : '⚠️'}\n`);

// Benchmark 2: Effect Tracking
console.log('📊 Benchmark 2: Effect Tracking');
const effectStart = performance.now();
const source = signal(0);
let effectCount = 0;
Array.from({ length: 100 }, () => {
  effect(() => { source.get(); effectCount++; });
});
source.set(1);
setTimeout(() => {
  const effectTime = performance.now() - effectStart;
  console.log(`   100 effects tracking 1 signal: ${effectTime.toFixed(2)}ms`);
  console.log(`   Target: < 3ms | Status: ${effectTime < 3 ? '✅' : '⚠️'}\n`);
  
  // Benchmark 3: VNode Creation
  console.log('📊 Benchmark 3: VNode Creation');
  const vnodeStart = performance.now();
  Array.from({ length: 1000 }, (_, i) => h('div', { class: `item-${i}`, key: i }, [`Item ${i}`]));
  const vnodeTime = performance.now() - vnodeStart;
  console.log(`   1000 VNodes created: ${vnodeTime.toFixed(2)}ms`);
  console.log(`   Target: < 6ms | Status: ${vnodeTime < 6 ? '✅' : '⚠️'}\n`);
  
  // Benchmark 4: Diff Performance
  console.log('📊 Benchmark 4: Diff Performance');
  const oldTree = h('div', null, 
    ...Array.from({ length: 100 }, (_, i) => h('span', { key: i }, [`Item ${i}`]))
  );
  const newTree = h('div', null,
    ...Array.from({ length: 100 }, (_, i) => h('span', { key: i }, [`Item ${i % 2 === 0 ? i + 1000 : i}`]))
  );
  const diffStart = performance.now();
  const patches = diff(oldTree, newTree);
  const diffTime = performance.now() - diffStart;
  console.log(`   Diff 100 nodes (50 changes): ${diffTime.toFixed(2)}ms (${patches.length} patches)`);
  console.log(`   Target: < 2ms | Status: ${diffTime < 2 ? '✅' : '⚠️'}\n`);
  
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║              ✅ All benchmarks completed!               ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
}, 10);
