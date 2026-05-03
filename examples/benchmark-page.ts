// @ts-nocheck
import { createApp, computed, h, list, show, signal, text } from '../src/index.js';
import { benchmarkScenario, runBenchmarkSuite } from './benchmark-core.js';

const formatMs = (value) => `${value.toFixed(value >= 10 ? 1 : 2)} ms`;
const formatCount = (value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(Math.round(value));

function Stat({ label, value, tone = 'default' }) {
  return h('article', { className: ['stat', `tone-${tone}`] },
    h('span', { className: 'stat-label' }, label),
    h('strong', { className: 'stat-value' }, text(value))
  );
}

function ResultCard({ result, leader }) {
  return h('article', { className: () => ['benchmark-card', { leader }] },
    h('div', { className: 'compare-head' },
      h('div', null,
        h('span', { className: 'card-kicker' }, leader ? 'Winner' : 'Reference'),
        h('strong', null, result.label)
      ),
      h('span', null, text(() => formatMs(result.averageDurationMs)))
    ),
    h('p', { className: 'compare-note' }, result.description),
    h('div', { className: 'stats-grid benchmark-stats' },
      Stat({ label: 'first paint', value: () => formatMs(result.averageFirstMutationMs), tone: leader ? 'live' : 'default' }),
      Stat({ label: 'records', value: () => formatCount(result.averageMutationRecords) }),
      Stat({ label: 'char data', value: () => formatCount(result.averageCharacterDataMutations) }),
      Stat({ label: 'added', value: () => formatCount(result.averageAddedNodes), tone: result.averageAddedNodes > 0 ? 'warm' : 'default' }),
      Stat({ label: 'removed', value: () => formatCount(result.averageRemovedNodes), tone: result.averageRemovedNodes > 0 ? 'warm' : 'default' }),
      Stat({ label: 'html bytes', value: () => formatCount(result.averageRewrittenBytes) })
    )
  );
}

createApp(() => {
  const suite = signal({
    meta: {
      ...benchmarkScenario,
      methodology: 'Same transcript, same chunks, same final text. The only difference is how the UI path handles each token.'
    },
    results: []
  });
  const status = signal('idle');
  const error = signal('');
  const runs = signal(0);

  const leader = computed(() => {
    const [first] = [...suite().results].sort((left, right) => left.averageDurationMs - right.averageDurationMs);
    return first ? first.id : null;
  });

  const summary = computed(() => {
    const results = suite().results;
    const qoreResult = results.find((entry) => entry.id === 'qore');
    const snapshotResult = results.find((entry) => entry.id === 'snapshot');

    if (!qoreResult || !snapshotResult) {
      return 'Run the benchmark to measure Qore against the snapshot rerender baseline.';
    }

    const durationRatio = snapshotResult.averageDurationMs / qoreResult.averageDurationMs;
    const savedNodes = snapshotResult.averageAddedNodes - qoreResult.averageAddedNodes;
    const savedMarkup = snapshotResult.averageRewrittenBytes;

    return `Qore finishes ${durationRatio.toFixed(1)}x faster, avoids about ${formatCount(savedNodes)} rebuilt nodes, and skips roughly ${formatCount(savedMarkup)} regenerated HTML bytes per run.`;
  });

  const run = async () => {
    if (status() === 'running') {
      return;
    }

    status('running');
    error('');

    try {
      suite(await runBenchmarkSuite());
      runs.update((count) => count + 1);
      status('ready');
    } catch (reason) {
      error(reason instanceof Error ? reason.message : String(reason));
      status('error');
    }
  };

  return {
    onMount: () => {
      void run();
    },
    view: () => h('main', { className: 'site benchmark-page' },
      h('header', { className: 'nav' },
        h('a', { className: 'brand', href: '../index.html' },
          h('span', { className: 'brand-mark' }, 'Q'),
          h('span', { className: 'brand-copy' },
            h('strong', null, 'Qore'),
            h('span', null, 'Benchmark')
          )
        ),
        h('nav', { className: 'nav-links' },
          h('a', { className: 'nav-link', href: '../index.html' }, 'Home'),
          h('a', { className: 'nav-link', href: './streaming-response.html' }, 'Focused Demo')
        )
      ),
      h('section', { className: 'benchmark-hero' },
        h('div', { className: 'hero-copy' },
          h('p', { className: 'eyebrow' }, 'Qore / benchmark'),
          h('h1', null, 'One transcript. Two rendering paths.'),
          h('p', { className: 'lede' }, 'This benchmark keeps the transcript, chunk list, and final answer identical. It only swaps the UI path that receives each token.'),
          h('div', { className: 'benchmark-meta' },
            h('span', { className: 'mini-pill subtle' }, text(() => `${suite().meta.historicalMessages} history messages`)),
            h('span', { className: 'mini-pill subtle' }, text(() => `${suite().meta.chunkCount} chunks`)),
            h('span', { className: 'mini-pill subtle' }, text(() => `${suite().meta.sampleCount} samples`)),
            h('span', { className: 'mini-pill subtle' }, text(() => `run ${runs()}`))
          ),
          h('div', { className: 'hero-actions' },
            h('button', {
              className: 'solid-link benchmark-button',
              onclick: () => {
                void run();
              },
              disabled: () => status() === 'running'
            }, text(() => status() === 'running' ? 'Running…' : 'Run Again')),
            h('a', { className: 'ghost-link', href: 'https://github.com/qorejs/qore/blob/main/examples/benchmark-core.js' }, 'View Methodology')
          )
        ),
        h('article', { className: 'panel benchmark-callout' },
          h('span', { className: 'card-kicker' }, 'Summary'),
          h('p', null, text(() => suite().meta.methodology)),
          h('strong', null, text(() => summary()))
        )
      ),
      show(() => status() === 'error',
        () => h('article', { className: 'panel benchmark-error' }, error())
      ),
      h('section', { className: 'benchmark-strip benchmark-page-grid' },
        show(() => suite().results.length > 0,
          () => h('div', { className: 'benchmark-grid' },
            list(() => suite().results, (result) => ResultCard({ result, leader: leader() === result.id }))
          ),
          () => h('article', { className: 'panel benchmark-placeholder' },
            h('span', { className: 'card-kicker' }, 'Waiting'),
            h('p', null, 'The benchmark runs automatically on load and can be re-run at any time.')
          )
        )
      )
    )
  };
}).mount('#app');
