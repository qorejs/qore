/**
 * Qore Performance Benchmarks - P1 Complete Suite
 * Run with: pnpm bench
 */

import { runAllBenchmarks, printSummaryReport } from './framework-comparison';
import { runAllMemoryTests, printMemoryTestSummary } from './memory-leak-test';
import { runAllRenderTests, printRenderTestSummary } from './large-scale-render';

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║           🚀 Qore P1 Performance Test Suite             ║');
console.log('║              Framework + Memory + Rendering             ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

// Run framework comparison benchmarks
console.log('═══════════════════════════════════════════════════════════');
console.log('  PART 1: Framework Comparison Benchmarks');
console.log('═══════════════════════════════════════════════════════════\n');

runAllBenchmarks();

// Wait for async benchmarks to complete
setTimeout(() => {
  printSummaryReport();
  
  // Run memory leak tests
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  PART 2: Memory Leak Detection');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  runAllMemoryTests().then(() => {
    printMemoryTestSummary();
    
    // Run large scale render tests
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  PART 3: Large Scale Rendering Tests');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    runAllRenderTests();
    printRenderTestSummary();
    
    // Final summary
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║           ✅ P1 Benchmark Suite Complete!               ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
  });
}, 500);
