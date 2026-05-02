import { h, mount, stream, text } from '../src/index.js';

// Use a consistent transcript shell so every benchmark run measures the same DOM workload.
const benchmarkHistory = [
  { role: 'assistant', body: 'Qore keeps the UI attached to the stream instead of waiting for a final snapshot.' },
  { role: 'user', body: 'Show me a minimal chat loop.' },
  { role: 'assistant', body: 'One stream, one signal, one text node that keeps updating.' },
  { role: 'user', body: 'Why does backpressure matter?' },
  { role: 'assistant', body: 'Because token speed and UI speed are not the same thing.' },
  { role: 'user', body: 'What should the homepage prove?' },
  { role: 'assistant', body: 'That the stream is the state source, not a side channel.' },
  { role: 'user', body: 'Then benchmark the actual transcript shape.' }
];

const benchmarkAnswer = `### Stream = Signal\nQore lets the same value act as live stream state and reactive UI input. The transcript shell mounts once, then the streaming answer keeps advancing the same text node instead of rebuilding the chat tree on every token.\n\n\`\`\`js\nconst answer = stream(openai.chat(prompt));\nreturn h('div', {}, text(() => answer()));\n\`\`\`\n\nBackpressure, lifecycle, and partial output stay in one primitive.`;

const benchmarkChunks = benchmarkAnswer.match(/```|`[^`]*`|\*\*[^*]+\*\*|\n|[^\s]{1,6}\s?/g) ?? [benchmarkAnswer];

export const benchmarkScenario = {
  historicalMessages: benchmarkHistory.length,
  chunkCount: benchmarkChunks.length,
  characterCount: benchmarkAnswer.length,
  sampleCount: 7
};

function escapeHtml(value = '') {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function countTreeNodes(node) {
  if (!node) {
    return 0;
  }

  let count = 1;

  for (const child of node.childNodes ?? []) {
    count += countTreeNodes(child);
  }

  return count;
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

function nextMicrotask() {
  return Promise.resolve();
}

function average(values) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function createSandbox(host = document.body) {
  const sandbox = document.createElement('div');
  sandbox.setAttribute('aria-hidden', 'true');
  sandbox.style.position = 'fixed';
  sandbox.style.left = '-200vw';
  sandbox.style.top = '0';
  sandbox.style.width = '420px';
  sandbox.style.pointerEvents = 'none';
  sandbox.style.opacity = '0';
  sandbox.style.contain = 'strict';
  host.appendChild(sandbox);
  return sandbox;
}

function createMutationTracker(target) {
  const metrics = {
    mutationRecords: 0,
    childListMutations: 0,
    characterDataMutations: 0,
    addedNodes: 0,
    removedNodes: 0,
    firstMutationMs: null,
    lastMutationMs: 0
  };

  const startedAt = performance.now();
  const observer = new MutationObserver((records) => {
    const now = performance.now() - startedAt;

    if (metrics.firstMutationMs == null) {
      metrics.firstMutationMs = now;
    }

    metrics.lastMutationMs = now;
    metrics.mutationRecords += records.length;

    for (const record of records) {
      if (record.type === 'childList') {
        metrics.childListMutations += 1;

        for (const node of record.addedNodes) {
          metrics.addedNodes += countTreeNodes(node);
        }

        for (const node of record.removedNodes) {
          metrics.removedNodes += countTreeNodes(node);
        }
      }

      if (record.type === 'characterData') {
        metrics.characterDataMutations += 1;
      }
    }
  });

  observer.observe(target, {
    subtree: true,
    childList: true,
    characterData: true
  });

  return {
    async stop() {
      await nextMicrotask();
      observer.disconnect();
      return {
        ...metrics,
        firstMutationMs: metrics.firstMutationMs ?? 0,
        activeDurationMs: metrics.lastMutationMs
      };
    }
  };
}

function renderStaticMessage(message) {
  return `<article class="bench-msg ${message.role}"><strong>${message.role === 'assistant' ? 'Qore' : 'You'}</strong><p>${escapeHtml(message.body)}</p></article>`;
}

function renderSnapshotShell(answer) {
  return `<section class="bench-frame"><header class="bench-head"><span>stream = signal</span><span>${benchmarkChunks.length} chunks</span></header><div class="bench-feed">${benchmarkHistory.map(renderStaticMessage).join('')}<article class="bench-msg assistant live"><strong>Qore</strong><p>${escapeHtml(answer)}</p></article></div><footer class="bench-foot"><span>composer</span><span>one transcript</span></footer></section>`;
}

function renderQoreShell(answer) {
  return h('section', { className: 'bench-frame' },
    h('header', { className: 'bench-head' },
      h('span', null, 'stream = signal'),
      h('span', null, `${benchmarkChunks.length} chunks`)
    ),
    h('div', { className: 'bench-feed' },
      benchmarkHistory.map((message) => h('article', { className: ['bench-msg', message.role] },
        h('strong', null, message.role === 'assistant' ? 'Qore' : 'You'),
        h('p', null, message.body)
      )),
      h('article', { className: ['bench-msg', 'assistant', 'live'] },
        h('strong', null, 'Qore'),
        h('p', null, text(() => answer()))
      )
    ),
    h('footer', { className: 'bench-foot' },
      h('span', null, 'composer'),
      h('span', null, 'one transcript')
    )
  );
}

async function runQoreSample() {
  const sandbox = createSandbox();
  const gate = createDeferred();
  const answer = stream(async ({ push }) => {
    await gate.promise;

    for (const chunk of benchmarkChunks) {
      await push(chunk);
    }
  });
  const dispose = mount(sandbox, () => renderQoreShell(answer));

  await nextMicrotask();

  const tracker = createMutationTracker(sandbox);
  const startedAt = performance.now();
  gate.resolve();
  await answer.ready;
  await nextMicrotask();
  const totalDurationMs = performance.now() - startedAt;
  const observed = await tracker.stop();

  dispose();
  sandbox.remove();

  return {
    mode: 'qore',
    commits: benchmarkChunks.length,
    rewrittenBytes: 0,
    totalDurationMs,
    ...observed
  };
}

async function runSnapshotSample() {
  const sandbox = createSandbox();
  let answer = '';
  let rewrittenBytes = 0;

  sandbox.innerHTML = renderSnapshotShell(answer);
  await nextMicrotask();

  const tracker = createMutationTracker(sandbox);
  const startedAt = performance.now();

  for (const chunk of benchmarkChunks) {
    answer += chunk;
    const html = renderSnapshotShell(answer);
    rewrittenBytes += html.length;
    sandbox.innerHTML = html;
  }

  await nextMicrotask();
  const totalDurationMs = performance.now() - startedAt;
  const observed = await tracker.stop();

  sandbox.remove();

  return {
    mode: 'snapshot',
    commits: benchmarkChunks.length,
    rewrittenBytes,
    totalDurationMs,
    ...observed
  };
}

function summarizeRuns(id, label, description, runs) {
  return {
    id,
    label,
    description,
    samples: runs.length,
    chunkCount: benchmarkChunks.length,
    characterCount: benchmarkAnswer.length,
    averageDurationMs: average(runs.map((run) => run.totalDurationMs)),
    averageFirstMutationMs: average(runs.map((run) => run.firstMutationMs)),
    averageMutationRecords: average(runs.map((run) => run.mutationRecords)),
    averageCharacterDataMutations: average(runs.map((run) => run.characterDataMutations)),
    averageAddedNodes: average(runs.map((run) => run.addedNodes)),
    averageRemovedNodes: average(runs.map((run) => run.removedNodes)),
    averageRewrittenBytes: average(runs.map((run) => run.rewrittenBytes)),
    averageCommits: average(runs.map((run) => run.commits)),
    averageActiveDurationMs: average(runs.map((run) => run.activeDurationMs))
  };
}

export async function runBenchmarkSuite(options = {}) {
  const samples = Math.max(1, options.samples ?? benchmarkScenario.sampleCount);
  const qoreRuns = [];
  const snapshotRuns = [];

  for (let index = 0; index < samples; index += 1) {
    qoreRuns.push(await runQoreSample());
    snapshotRuns.push(await runSnapshotSample());
  }

  const results = [
    summarizeRuns(
      'qore',
      'Qore stream = signal',
      'Mount the transcript once, then let a live stream advance the same text node.',
      qoreRuns
    ),
    summarizeRuns(
      'snapshot',
      'Snapshot rerender baseline',
      'Rebuild the transcript shell as a string on every chunk, like a snapshot-first chat loop.',
      snapshotRuns
    )
  ];

  const fastest = Math.min(...results.map((result) => result.averageDurationMs));

  return {
    meta: {
      ...benchmarkScenario,
      sampleCount: samples,
      methodology: 'Same transcript, same chunks, same final text. The only difference is how the UI path handles each token.'
    },
    results: results.map((result) => ({
      ...result,
      relativeToFastest: fastest > 0 ? result.averageDurationMs / fastest : 1
    }))
  };
}
