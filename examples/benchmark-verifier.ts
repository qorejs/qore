import type { BenchmarkSuite, BenchmarkSummary } from './benchmark-core.js';

export interface BenchmarkVerification {
  qore: BenchmarkSummary;
  snapshot: BenchmarkSummary;
  durationRatio: number;
  nodeSavings: number;
  removedNodeDelta: number;
  mutationSavings: number;
  rewrittenByteSavings: number;
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function findResult(suite: BenchmarkSuite, id: 'qore' | 'snapshot'): BenchmarkSummary {
  const result = suite.results.find((entry) => entry.id === id);
  invariant(result, `Benchmark suite is missing the ${id} result.`);
  return result;
}

export function verifyBenchmarkSuite(suite: BenchmarkSuite): BenchmarkVerification {
  const qore = findResult(suite, 'qore');
  const snapshot = findResult(suite, 'snapshot');

  invariant(suite.meta.chunkCount > 0, 'Benchmark suite must report a positive chunk count.');
  invariant(suite.meta.characterCount > 0, 'Benchmark suite must report a positive character count.');
  invariant(qore.averageCharacterDataMutations > 0, 'Qore benchmark path must mutate text nodes.');
  invariant(snapshot.averageRewrittenBytes > 0, 'Snapshot benchmark path must rewrite HTML bytes.');
  invariant(qore.averageRewrittenBytes === 0, 'Qore benchmark path must not rewrite HTML bytes.');
  invariant(qore.averageAddedNodes < snapshot.averageAddedNodes, 'Qore should add fewer DOM nodes than the snapshot baseline.');
  invariant(qore.averageRemovedNodes <= snapshot.averageRemovedNodes, 'Qore should not remove more DOM nodes than the snapshot baseline.');
  invariant(
    qore.averageMutationRecords <= snapshot.averageMutationRecords,
    'Qore should not produce more total mutation records than the snapshot baseline.'
  );
  invariant(
    qore.averageCharacterDataMutations > snapshot.averageCharacterDataMutations,
    'Qore benchmark path should spend its work on text-node updates instead of snapshot rerenders.'
  );
  invariant(qore.averageDurationMs < snapshot.averageDurationMs, 'Qore should complete faster than the snapshot baseline.');
  invariant(qore.averageCommits === snapshot.averageCommits, 'Benchmark variants must process the same number of commits.');

  return {
    qore,
    snapshot,
    durationRatio: snapshot.averageDurationMs / qore.averageDurationMs,
    nodeSavings: snapshot.averageAddedNodes - qore.averageAddedNodes,
    removedNodeDelta: snapshot.averageRemovedNodes - qore.averageRemovedNodes,
    mutationSavings: snapshot.averageMutationRecords - qore.averageMutationRecords,
    rewrittenByteSavings: snapshot.averageRewrittenBytes - qore.averageRewrittenBytes
  };
}

function formatMetric(value: number, digits = 2): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

export function formatBenchmarkVerificationMarkdown(
  suite: BenchmarkSuite,
  verification: BenchmarkVerification
): string {
  return [
    '# Qore Benchmark Gate',
    '',
    `- Samples: ${suite.meta.sampleCount}`,
    `- History messages: ${suite.meta.historicalMessages}`,
    `- Stream chunks: ${suite.meta.chunkCount}`,
    `- Final characters: ${suite.meta.characterCount}`,
    '',
    '## Outcome',
    '',
    `- Duration ratio: ${formatMetric(verification.durationRatio, 2)}x faster for Qore`,
    `- Added node savings: ${formatMetric(verification.nodeSavings)}`,
    `- Removed node delta: ${formatMetric(verification.removedNodeDelta)}`,
    `- Mutation record savings: ${formatMetric(verification.mutationSavings)}`,
    `- Rewritten HTML bytes avoided: ${formatMetric(verification.rewrittenByteSavings)}`,
    '',
    '## Raw Averages',
    '',
    '| Path | Duration (ms) | Mutation records | Added nodes | Removed nodes | Rewritten bytes | Commits |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    `| Qore | ${formatMetric(verification.qore.averageDurationMs)} | ${formatMetric(verification.qore.averageMutationRecords)} | ${formatMetric(verification.qore.averageAddedNodes)} | ${formatMetric(verification.qore.averageRemovedNodes)} | ${formatMetric(verification.qore.averageRewrittenBytes)} | ${formatMetric(verification.qore.averageCommits)} |`,
    `| Snapshot | ${formatMetric(verification.snapshot.averageDurationMs)} | ${formatMetric(verification.snapshot.averageMutationRecords)} | ${formatMetric(verification.snapshot.averageAddedNodes)} | ${formatMetric(verification.snapshot.averageRemovedNodes)} | ${formatMetric(verification.snapshot.averageRewrittenBytes)} | ${formatMetric(verification.snapshot.averageCommits)} |`,
    ''
  ].join('\n');
}
