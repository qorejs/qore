import { signal, effect, h } from '@qore/core';

console.log('🚀 Qore Performance Benchmarks\n');

console.log('📊 Benchmark 1: Signal Operations');
const signalStart = performance.now();
const signals = Array.from({ length: 1000 }, (_, i) => signal(i));
for (let i = 0; i < 1000; i++) signals[i].set(i + 1);
console.log(`   1000 signals created/updated: ${(performance.now() - signalStart).toFixed(2)}ms\n`);

console.log('📊 Benchmark 2: Effect Tracking');
const effectStart = performance.now();
const source = signal(0);
let effectCount = 0;
Array.from({ length: 100 }, () => {
  effect(() => { source.get(); effectCount++; });
});
source.set(1);
setTimeout(() => {
  console.log(`   100 effects tracking 1 signal: ${(performance.now() - effectStart).toFixed(2)}ms\n`);
  
  console.log('📊 Benchmark 3: VNode Creation');
  const vnodeStart = performance.now();
  Array.from({ length: 1000 }, (_, i) => h('div', { class: `item-${i}` }, [`Item ${i}`]));
  console.log(`   1000 VNodes created: ${(performance.now() - vnodeStart).toFixed(2)}ms\n`);
  
  console.log('✅ All benchmarks completed!\n');
}, 10);
