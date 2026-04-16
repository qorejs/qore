/**
 * Qore Model Loading Performance Benchmark
 * Tests: First load time, Cache hit time, Performance improvement percentage
 * Target: 60%+ improvement, < 100ms cache hit time
 */

import { ModelLoader, loadModel } from '../packages/core/src/model';

interface BenchmarkResult {
  testName: string;
  iterations: number;
  times: number[];
  min: number;
  max: number;
  avg: number;
  median: number;
  p95: number;
  p99: number;
  stdDev: number;
}

interface PerformanceReport {
  firstLoadTime: BenchmarkResult;
  cacheHitTime: BenchmarkResult;
  improvementPercentage: number;
  cacheHitRate: number;
  retryMechanismTest: {
    passed: boolean;
    attempts: number[];
    successRate: number;
  };
  targetMet: {
    improvement60Percent: boolean;
    cacheHitUnder100ms: boolean;
    retryWorking: boolean;
    overall: boolean;
  };
  timestamp: string;
}

/**
 * Calculate statistics from an array of numbers
 */
function calculateStats(times: number[], name: string): BenchmarkResult {
  const sorted = [...times].sort((a, b) => a - b);
  const n = sorted.length;
  
  const min = sorted[0];
  const max = sorted[n - 1];
  const avg = sorted.reduce((a, b) => a + b, 0) / n;
  const median = n % 2 === 0 
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 
    : sorted[Math.floor(n / 2)];
  const p95 = sorted[Math.floor(n * 0.95)];
  const p99 = sorted[Math.floor(n * 0.99)];
  
  // Standard deviation
  const variance = sorted.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  
  return {
    testName: name,
    iterations: n,
    times: sorted,
    min,
    max,
    avg,
    median,
    p95,
    p99,
    stdDev
  };
}

/**
 * Test first load time (cold start, no cache)
 * Uses local mock source to avoid network delays
 */
async function testFirstLoadTime(iterations: number = 10): Promise<BenchmarkResult> {
  console.log('🔥 Testing First Load Time (Cold Start)...');
  const times: number[] = [];
  const loader = ModelLoader.getInstance();
  
  for (let i = 0; i < iterations; i++) {
    // Clear cache before each iteration
    loader.clearCache();
    
    const startTime = performance.now();
    try {
      // Use local mock source (not http/https) to avoid network delays
      await loadModel({
        name: `test-model-first-${i}`,
        source: `mock-model-${i}`,
        cacheTTL: 3600000,
        maxRetries: 3,
        retryDelay: 100,
        timeout: 5000
      });
      const endTime = performance.now();
      times.push(endTime - startTime);
    } catch (error) {
      console.warn(`Iteration ${i} failed:`, error);
      const endTime = performance.now();
      times.push(endTime - startTime);
    }
  }
  
  const result = calculateStats(times, 'First Load Time');
  console.log(`   ✓ Completed ${iterations} iterations`);
  console.log(`   📊 Avg: ${result.avg.toFixed(2)}ms, Median: ${result.median.toFixed(2)}ms, P95: ${result.p95.toFixed(2)}ms\n`);
  return result;
}

/**
 * Test cache hit time (warm cache)
 * Uses local mock source to avoid network delays
 */
async function testCacheHitTime(iterations: number = 20): Promise<BenchmarkResult> {
  console.log('⚡ Testing Cache Hit Time (Warm Cache)...');
  const times: number[] = [];
  const loader = ModelLoader.getInstance();
  
  // Pre-load a model to populate cache
  console.log('   Pre-loading model to populate cache...');
  await loadModel({
    name: 'cached-test-model',
    source: 'mock-cached-model',
    cacheTTL: 3600000,
    preload: true
  });
  
  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    try {
      await loadModel({
        name: 'cached-test-model',
        source: 'mock-cached-model',
        cacheTTL: 3600000
      });
      const endTime = performance.now();
      times.push(endTime - startTime);
    } catch (error) {
      console.warn(`Iteration ${i} failed:`, error);
      const endTime = performance.now();
      times.push(endTime - startTime);
    }
  }
  
  const result = calculateStats(times, 'Cache Hit Time');
  console.log(`   ✓ Completed ${iterations} iterations`);
  console.log(`   📊 Avg: ${result.avg.toFixed(2)}ms, Median: ${result.median.toFixed(2)}ms, P95: ${result.p95.toFixed(2)}ms\n`);
  return result;
}

/**
 * Test retry mechanism
 */
async function testRetryMechanism(iterations: number = 5): Promise<{
  passed: boolean;
  attempts: number[];
  successRate: number;
}> {
  console.log('🔄 Testing Retry Mechanism...');
  const attempts: number[] = [];
  let successes = 0;
  const loader = ModelLoader.getInstance();
  
  for (let i = 0; i < iterations; i++) {
    loader.clearCache();
    
    let retryCount = 0;
    const onRetry = () => {
      retryCount++;
    };
    
    try {
      const result = await loadModel({
        name: `retry-test-${i}`,
        source: 'https://invalid-url-that-will-fail.com/model.json',
        maxRetries: 3,
        retryDelay: 50,
        timeout: 500,
        onRetry,
        fallbackStrategy: 'default',
        fallbackData: { mock: true }
      });
      
      attempts.push(retryCount);
      if (result.status === 'ready') {
        successes++;
      }
    } catch (error) {
      attempts.push(retryCount);
    }
  }
  
  const successRate = (successes / iterations) * 100;
  const avgRetries = attempts.reduce((a, b) => a + b, 0) / iterations;
  
  console.log(`   ✓ Completed ${iterations} iterations`);
  console.log(`   📊 Success Rate: ${successRate.toFixed(1)}%, Avg Retries: ${avgRetries.toFixed(1)}\n`);
  
  return {
    passed: successRate > 0, // Fallback should work
    attempts,
    successRate
  };
}

/**
 * Test cache hit rate improvement
 * Uses local mock source to avoid network delays
 */
async function testCacheHitRate(iterations: number = 30): Promise<number> {
  console.log('📈 Testing Cache Hit Rate...');
  const loader = ModelLoader.getInstance();
  loader.clearCache();
  
  let cacheHits = 0;
  let cacheMisses = 0;
  
  // Load unique models first (cache misses)
  for (let i = 0; i < iterations / 3; i++) {
    await loadModel({
      name: `unique-model-${i}`,
      source: `mock-model-${i}`,
      cacheTTL: 3600000
    });
    cacheMisses++;
  }
  
  // Now load same models again (should be cache hits)
  for (let i = 0; i < iterations / 3; i++) {
    const result = await loadModel({
      name: `unique-model-${i}`,
      source: `mock-model-${i}`,
      cacheTTL: 3600000
    });
    if (result.status === 'ready' && result.loadTime && result.loadTime < 50) {
      cacheHits++;
    } else {
      cacheMisses++;
    }
  }
  
  // Mix of new and cached
  for (let i = 0; i < iterations / 3; i++) {
    const modelId = i % 2 === 0 ? `unique-model-${i % (iterations / 3)}` : `new-model-${i}`;
    const result = await loadModel({
      name: modelId,
      source: modelId.startsWith('unique') ? `mock-model-${i % (iterations / 3)}` : `mock-model-${i}`,
      cacheTTL: 3600000
    });
    if (result.status === 'ready' && result.loadTime && result.loadTime < 50) {
      cacheHits++;
    } else {
      cacheMisses++;
    }
  }
  
  const total = cacheHits + cacheMisses;
  const hitRate = (cacheHits / total) * 100;
  
  console.log(`   ✓ Cache Hits: ${cacheHits}, Cache Misses: ${cacheMisses}`);
  console.log(`   📊 Hit Rate: ${hitRate.toFixed(1)}%\n`);
  
  return hitRate;
}

/**
 * Calculate performance improvement percentage
 */
function calculateImprovement(firstLoad: BenchmarkResult, cacheHit: BenchmarkResult): number {
  const improvement = ((firstLoad.avg - cacheHit.avg) / firstLoad.avg) * 100;
  return improvement;
}

/**
 * Generate markdown report
 */
function generateReport(results: PerformanceReport): string {
  const date = new Date().toLocaleString('zh-CN');
  
  return `# 🚀 Qore Model Loading Performance Report

**Generated:** ${date}

---

## 📊 Executive Summary

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Performance Improvement | ≥60% | ${results.improvementPercentage.toFixed(1)}% | ${results.targetMet.improvement60Percent ? '✅ PASS' : '❌ FAIL'} |
| Cache Hit Time | <100ms | ${results.cacheHitTime.avg.toFixed(2)}ms | ${results.targetMet.cacheHitUnder100ms ? '✅ PASS' : '❌ FAIL'} |
| Retry Mechanism | Working | ${results.retryMechanismTest.passed ? 'Yes' : 'No'} | ${results.targetMet.retryWorking ? '✅ PASS' : '❌ FAIL'} |
| **Overall** | - | - | ${results.targetMet.overall ? '🎉 ALL TARGETS MET' : '⚠️ OPTIMIZATION NEEDED'} |

---

## 🔥 First Load Time (Cold Start)

**Iterations:** ${results.firstLoadTime.iterations}

| Metric | Value |
|--------|-------|
| Minimum | ${results.firstLoadTime.min.toFixed(2)}ms |
| Maximum | ${results.firstLoadTime.max.toFixed(2)}ms |
| **Average** | **${results.firstLoadTime.avg.toFixed(2)}ms** |
| Median | ${results.firstLoadTime.median.toFixed(2)}ms |
| P95 | ${results.firstLoadTime.p95.toFixed(2)}ms |
| P99 | ${results.firstLoadTime.p99.toFixed(2)}ms |
| Std Dev | ${results.firstLoadTime.stdDev.toFixed(2)}ms |

---

## ⚡ Cache Hit Time (Warm Cache)

**Iterations:** ${results.cacheHitTime.iterations}

| Metric | Value |
|--------|-------|
| Minimum | ${results.cacheHitTime.min.toFixed(2)}ms |
| Maximum | ${results.cacheHitTime.max.toFixed(2)}ms |
| **Average** | **${results.cacheHitTime.avg.toFixed(2)}ms** |
| Median | ${results.cacheHitTime.median.toFixed(2)}ms |
| P95 | ${results.cacheHitTime.p95.toFixed(2)}ms |
| P99 | ${results.cacheHitTime.p99.toFixed(2)}ms |
| Std Dev | ${results.cacheHitTime.stdDev.toFixed(2)}ms |

---

## 📈 Performance Improvement

**Improvement Percentage:** ${results.improvementPercentage.toFixed(1)}%

\`\`\`
First Load Avg: ${results.firstLoadTime.avg.toFixed(2)}ms
Cache Hit Avg:  ${results.cacheHitTime.avg.toFixed(2)}ms
Improvement:    ${results.improvementPercentage.toFixed(1)}%
\`\`\`

---

## 🔄 Retry Mechanism Test

| Metric | Value |
|--------|-------|
| Status | ${results.retryMechanismTest.passed ? '✅ Working' : '❌ Failed'} |
| Success Rate | ${results.retryMechanismTest.successRate.toFixed(1)}% |
| Retry Attempts | ${JSON.stringify(results.retryMechanismTest.attempts)} |

---

## 🎯 Cache Hit Rate

**Cache Hit Rate:** ${results.cacheHitRate.toFixed(1)}%

---

## 💡 Recommendations

${!results.targetMet.improvement60Percent ? `
### Performance Improvement Below Target
- Current: ${results.improvementPercentage.toFixed(1)}%
- Target: 60%+
- **Action:** Optimize cache lookup mechanism, reduce overhead in cache hit path
` : ''}

${!results.targetMet.cacheHitUnder100ms ? `
### Cache Hit Time Above Target
- Current: ${results.cacheHitTime.avg.toFixed(2)}ms
- Target: <100ms
- **Action:** Profile cache access code, optimize memory cache lookups
` : ''}

${!results.targetMet.retryWorking ? `
### Retry Mechanism Issues
- **Action:** Review retry logic, ensure fallback strategies are properly configured
` : ''}

${results.targetMet.overall ? `
### 🎉 All Targets Met!
The model loading system is performing optimally. Continue monitoring and consider:
- Adding more comprehensive load testing
- Testing under various network conditions
- Monitoring in production environment
` : ''}

---

## 📝 Test Configuration

- Node.js: ${process.version}
- Platform: ${process.platform} ${process.arch}
- Test Iterations: ${results.firstLoadTime.iterations} (first load), ${results.cacheHitTime.iterations} (cache hit)
- Cache TTL: 3600000ms (1 hour)
- Max Retries: 3
- Timeout: 5000ms

---

*Report generated by Qore Performance Benchmark Suite*
`;
}

/**
 * Run all benchmarks and generate report
 */
export async function runModelLoadingBenchmarks(): Promise<PerformanceReport> {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       🚀 Qore Model Loading Performance Benchmark       ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  // Run tests
  const firstLoadResult = await testFirstLoadTime(10);
  const cacheHitResult = await testCacheHitTime(20);
  const retryTest = await testRetryMechanism(5);
  const cacheHitRate = await testCacheHitRate(30);
  
  // Calculate metrics
  const improvementPercentage = calculateImprovement(firstLoadResult, cacheHitResult);
  
  // Check targets
  const targetMet = {
    improvement60Percent: improvementPercentage >= 60,
    cacheHitUnder100ms: cacheHitResult.avg < 100,
    retryWorking: retryTest.passed,
    overall: improvementPercentage >= 60 && cacheHitResult.avg < 100 && retryTest.passed
  };
  
  const report: PerformanceReport = {
    firstLoadTime: firstLoadResult,
    cacheHitTime: cacheHitResult,
    improvementPercentage,
    cacheHitRate,
    retryMechanismTest: retryTest,
    targetMet,
    timestamp: new Date().toISOString()
  };
  
  // Print summary
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                    📊 Summary Report                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  console.log(`🎯 Performance Improvement: ${improvementPercentage.toFixed(1)}% (Target: 60%+) ${targetMet.improvement60Percent ? '✅' : '❌'}`);
  console.log(`⚡ Cache Hit Time: ${cacheHitResult.avg.toFixed(2)}ms (Target: <100ms) ${targetMet.cacheHitUnder100ms ? '✅' : '❌'}`);
  console.log(`🔄 Retry Mechanism: ${retryTest.passed ? 'Working' : 'Failed'} ${targetMet.retryWorking ? '✅' : '❌'}`);
  console.log(`📈 Cache Hit Rate: ${cacheHitRate.toFixed(1)}%\n`);
  
  if (targetMet.overall) {
    console.log('🎉 ALL TARGETS MET! Performance optimization successful!\n');
  } else {
    console.log('⚠️  SOME TARGETS NOT MET - Optimization may be needed\n');
  }
  
  return report;
}

/**
 * Save report to file
 */
export async function saveReport(report: PerformanceReport, filePath: string): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');
  
  const reportContent = generateReport(report);
  const dir = path.dirname(filePath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, reportContent, 'utf-8');
  console.log(`📄 Report saved to: ${filePath}\n`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      const report = await runModelLoadingBenchmarks();
      
      // Save to desktop
      const desktopPath = `${process.env.HOME}/Desktop/qore-model-performance-report.md`;
      await saveReport(report, desktopPath);
      
      // Also save to benchmarks/results
      const resultPath = './benchmarks/results/model-loading-performance-report.md';
      await saveReport(report, resultPath);
      
      console.log('✅ Benchmark complete!');
      process.exit(report.targetMet.overall ? 0 : 1);
    } catch (error) {
      console.error('❌ Benchmark failed:', error);
      process.exit(1);
    }
  })();
}
