import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatBenchmarkVerificationMarkdown,
  verifyBenchmarkSuite
} from '../examples/benchmark-verifier.js';
import type { BenchmarkSuite } from '../examples/benchmark-core.js';

const suite: BenchmarkSuite = {
  meta: {
    historicalMessages: 8,
    chunkCount: 12,
    characterCount: 240,
    sampleCount: 7
  },
  results: [
    {
      id: 'qore',
      label: 'Qore',
      description: 'stream = signal',
      samples: 7,
      chunkCount: 12,
      characterCount: 240,
      averageDurationMs: 8,
      averageFirstMutationMs: 1.2,
      averageMutationRecords: 24,
      averageCharacterDataMutations: 12,
      averageAddedNodes: 3,
      averageRemovedNodes: 0,
      averageRewrittenBytes: 0,
      averageCommits: 12,
      averageActiveDurationMs: 7
    },
    {
      id: 'snapshot',
      label: 'Snapshot',
      description: 'rerender everything',
      samples: 7,
      chunkCount: 12,
      characterCount: 240,
      averageDurationMs: 20,
      averageFirstMutationMs: 1.8,
      averageMutationRecords: 40,
      averageCharacterDataMutations: 12,
      averageAddedNodes: 18,
      averageRemovedNodes: 4,
      averageRewrittenBytes: 4096,
      averageCommits: 12,
      averageActiveDurationMs: 18
    }
  ]
};

test('verifyBenchmarkSuite returns computed deltas for benchmark evidence', () => {
  const verification = verifyBenchmarkSuite(suite);

  assert.equal(verification.qore.id, 'qore');
  assert.equal(verification.snapshot.id, 'snapshot');
  assert.equal(verification.durationRatio, 2.5);
  assert.equal(verification.nodeSavings, 15);
  assert.equal(verification.removedNodeDelta, 4);
  assert.equal(verification.mutationSavings, 16);
  assert.equal(verification.rewrittenByteSavings, 4096);
});

test('formatBenchmarkVerificationMarkdown renders a human-readable summary', () => {
  const verification = verifyBenchmarkSuite(suite);
  const markdown = formatBenchmarkVerificationMarkdown(suite, verification);

  assert.match(markdown, /# Qore Benchmark Gate/);
  assert.match(markdown, /Duration ratio: 2\.50x faster for Qore/);
  assert.match(markdown, /\| Qore \| 8 \| 24 \| 3 \| 0 \| 0 \| 12 \|/);
  assert.match(markdown, /\| Snapshot \| 20 \| 40 \| 18 \| 4 \| 4096 \| 12 \|/);
});

test('verifyBenchmarkSuite rejects invalid benchmark regressions', () => {
  const brokenSuite: BenchmarkSuite = {
    ...suite,
    results: suite.results.map((result) => result.id === 'qore'
      ? { ...result, averageDurationMs: 30 }
      : result)
  };

  assert.throws(
    () => verifyBenchmarkSuite(brokenSuite),
    /Qore should complete faster than the snapshot baseline/
  );
});
