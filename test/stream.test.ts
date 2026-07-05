import test from 'node:test';
import assert from 'node:assert/strict';

import { createStreamInspector, mapStream, scanStream, sleep, stream } from '../src/index.js';

// The default stream surface should read like a signal while keeping stream lifecycle state.
test('stream is also a signal and accumulates text by default', async () => {
  const answer = stream(async ({ push }) => {
    push('Qore ');
    push('is ');
    push('streaming-first.');
  });

  await answer.ready;

  assert.equal(answer(), 'Qore is streaming-first.');
  assert.equal(answer.status(), 'completed');
  assert.equal(answer.chunkCount(), 3);
});

// Async iteration should still expose every original chunk in order.
test('stream yields chunks pushed by the producer', async () => {
  const source = stream<string>(async ({ push }) => {
    push('stream');
    push('ing');
    push('-first');
  });

  const chunks: string[] = [];

  for await (const chunk of source) {
    chunks.push(chunk);
  }

  assert.deepEqual(chunks, ['stream', 'ing', '-first']);
});

// list streams should keep structured chunks instead of forcing text concatenation.
test('stream.list keeps structured chunks in signal form', async () => {
  const feed = stream.list(async ({ push }) => {
    push({ step: 1 });
    push({ step: 2 });
  });

  await feed.ready;

  assert.deepEqual(feed(), [{ step: 1 }, { step: 2 }]);
});

test('stream.json turns JSON token streams into structured signal state', async () => {
  type Answer = { title: string; steps: string[] };

  const answer = stream.json<Answer>(['{"title":"Qore",', '"steps":["stream",', '"signal"]}']);

  await answer.ready;

  assert.deepEqual(answer(), {
    title: 'Qore',
    steps: ['stream', 'signal']
  });
  assert.equal(answer.status(), 'completed');
  assert.equal(answer.chunkCount(), 1);
});

test('stream.json surfaces invalid structured output as a stream error', async () => {
  const answer = stream.json(['{"ok":']);

  await assert.rejects(answer.ready, SyntaxError);

  assert.equal(answer.status(), 'error');
  assert.equal(answer(), null);
});

test('stream.json ignores trailing whitespace without publishing duplicate objects', async () => {
  const answer = stream.json<{ ok: true }>(['{"ok":true}', '  \n']);

  await answer.ready;

  assert.deepEqual(answer(), { ok: true });
  assert.equal(answer.chunkCount(), 1);
});

test('stream.json rejects trailing garbage after an initially valid object', async () => {
  const answer = stream.json(['{"ok":true}', ' nope']);

  await assert.rejects(answer.ready, SyntaxError);

  assert.equal(answer.status(), 'error');
  assert.deepEqual(answer(), { ok: true });
});

test('stream.json can validate parsed structured output before publishing it', async () => {
  type Payload = { ok: true };

  const answer = stream.json<Payload>(['{"ok":false}'], {
    validate(value): value is Payload {
      return typeof value === 'object'
        && value !== null
        && 'ok' in value
        && value.ok === true;
    }
  });

  await assert.rejects(answer.ready, /validation/);

  assert.equal(answer.failed(), true);
  assert.equal(answer(), null);
});

test('stream.ndjson turns line-delimited JSON into a structured event signal', async () => {
  type Event = { type: 'token'; text: string } | { type: 'status'; value: 'done' };

  const events = stream.ndjson<Event>([
    '{"type":"token","text":"stream"}\n{"type":"token",',
    '"text":" signal"}\n',
    '\n{"type":"status","value":"done"}'
  ]);

  const chunks: Event[] = [];

  for await (const event of events) {
    chunks.push(event);
  }

  assert.deepEqual(chunks, [
    { type: 'token', text: 'stream' },
    { type: 'token', text: ' signal' },
    { type: 'status', value: 'done' }
  ]);
  assert.deepEqual(events(), chunks);
  assert.equal(events.status(), 'completed');
});

test('stream.ndjson rejects invalid trailing lines', async () => {
  const events = stream.ndjson(['{"ok":true}\n{"ok":']);

  await assert.rejects(events.ready, SyntaxError);

  assert.deepEqual(events(), [{ ok: true }]);
  assert.equal(events.status(), 'error');
});

test('stream.ndjson validates each published line', async () => {
  type Event = { type: 'token'; text: string };
  const events = stream.ndjson<Event>(['{"type":"status","value":"done"}\n'], {
    validate(value): value is Event {
      return typeof value === 'object'
        && value !== null
        && 'type' in value
        && value.type === 'token'
        && 'text' in value;
    }
  });

  await assert.rejects(events.ready, /validation/);

  assert.deepEqual(events(), []);
  assert.equal(events.failed(), true);
});

// Wrapping an existing stream should treat it as data, not as a setup callback.
test('stream can wrap another stream without treating it like a setup function', async () => {
  const source = stream<string>(async ({ push }) => {
    push('stream');
    push('ing');
    push('-first');
  });

  const mirrored = stream(source);

  await Promise.all([source.ready, mirrored.ready]);

  assert.equal(mirrored(), 'streaming-first');
  assert.deepEqual(mirrored.chunks(), ['stream', 'ing', '-first']);
});

// Public stream lifecycle signals are read-only wrappers around the internal state machine.
test('stream exposes read-only lifecycle signals', async () => {
  const answer = stream(['safe', ' state']);

  await answer.ready;

  const writableStatus = answer.status as unknown as (nextValue: string) => string;
  const writableChunks = answer.chunks as unknown as (nextValue: string[]) => string[];
  const exposedChunks = answer.chunks();

  writableStatus('pending');
  writableChunks([]);
  exposedChunks.push(' mutation');

  assert.equal(answer.status(), 'completed');
  assert.deepEqual(answer.chunks(), ['safe', ' state']);
  assert.equal(answer(), 'safe state');
});

// Long token runs should preserve history without making the public chunks array mutable.
test('stream keeps long chunk histories behind a defensive read boundary', async () => {
  const chunks = Array.from({ length: 2000 }, (_, index) => String(index % 10));
  const answer = stream(chunks);

  await answer.ready;

  const exposed = answer.chunks();
  exposed.length = 0;

  assert.equal(answer.chunkCount(), chunks.length);
  assert.equal(answer.chunks().length, chunks.length);
  assert.equal(answer().length, chunks.length);
});

// Abort should stop future chunks while keeping the partial text visible to the UI.
test('stream abort preserves the partial value collected so far', async () => {
  const answer = stream(async ({ push, signal }) => {
    push('Q');
    await sleep(50, signal);
    push('ore');
  });

  await sleep(10);
  answer.abort();
  await answer.ready;

  assert.equal(answer.status(), 'aborted');
  assert.equal(answer(), 'Q');
});

// Producer errors should reject ready and surface through the stream lifecycle state.
test('stream surfaces producer failures through ready and status', async () => {
  const answer = stream(async ({ push }) => {
    push('Q');
    throw new Error('boom');
  });

  await assert.rejects(answer.ready, /boom/);

  assert.equal(answer.status(), 'error');
  assert.equal(answer(), 'Q');
  const failure = answer.error();
  assert.ok(failure);
  assert.equal(failure.message, 'boom');
});

// latest streams should keep every chunk in history while exposing only the newest value.

test('stream emits development events when the DevTools hook is installed', async () => {
  const events: Array<{ phase: string; id: string; name?: string; chunk?: string; status?: string }> = [];
  const previousHook = globalThis.__QORE_DEVTOOLS__;
  globalThis.__QORE_DEVTOOLS__ = { events: events as never[] };

  try {
    const answer = stream(['A', 'I'], { name: 'answer-stream' });
    await answer.ready;

    assert.equal(answer.name, 'answer-stream');
    assert.ok(answer.id.startsWith('qore-stream-'));
    assert.deepEqual(events.map((event) => event.phase), ['create', 'status', 'chunk', 'chunk', 'complete']);
    assert.equal(events[0]?.name, 'answer-stream');
    assert.deepEqual(events.filter((event) => event.phase === 'chunk').map((event) => event.chunk), ['A', 'I']);
    assert.equal(events.at(-1)?.status, 'completed');
  } finally {
    globalThis.__QORE_DEVTOOLS__ = previousHook;
  }
});

test('createStreamInspector records stream timelines and restores the previous hook', async () => {
  const forwarded: string[] = [];
  const previousHook = globalThis.__QORE_DEVTOOLS__;
  const baseHook = (event: { phase: string }) => {
    forwarded.push(event.phase);
  };
  globalThis.__QORE_DEVTOOLS__ = baseHook;
  const inspector = createStreamInspector({ maxEvents: 3 });

  try {
    const answer = stream(['Q', 'ore'], { name: 'inspectable-answer' });
    await answer.ready;

    assert.deepEqual(forwarded, ['create', 'status', 'chunk', 'chunk', 'complete']);
    assert.deepEqual(inspector.events().map((event) => event.phase), ['chunk', 'chunk', 'complete']);

    const inspected = inspector.streams()[0];
    assert.ok(inspected);
    assert.equal(inspected.id, answer.id);
    assert.equal(inspected.name, 'inspectable-answer');
    assert.equal(inspected.status, 'completed');
    assert.equal(inspected.chunkCount, 2);
    assert.equal(inspected.value, 'Qore');
    assert.equal(inspected.terminal, true);
    assert.ok(inspected.finishedAt);
    assert.ok(inspected.durationMs !== undefined);
    assert.ok(inspected.firstChunkAt !== undefined);
    assert.ok(inspected.firstChunkLatencyMs !== undefined);
    assert.ok(inspected.chunksPerSecond !== undefined);

    const selectedByName = inspector.stream('inspectable-answer');
    assert.equal(selectedByName()?.id, answer.id);
    assert.equal(inspector.stream(answer.id), inspector.stream(answer.id));

    inspector.clear();
    assert.equal(inspector.events().length, 0);
    assert.equal(inspector.streams().length, 0);
  } finally {
    inspector.dispose();
    assert.equal(globalThis.__QORE_DEVTOOLS__, baseHook);
    globalThis.__QORE_DEVTOOLS__ = previousHook;
  }
});

test('createStreamInspector can avoid retaining chunk payloads', async () => {
  const previousHook = globalThis.__QORE_DEVTOOLS__;
  const inspector = createStreamInspector({ capturePayloads: false });

  try {
    const answer = stream(['large-token'], { name: 'metadata-only' });
    await answer.ready;

    const chunkEvent = inspector.events().find((event) => event.phase === 'chunk');
    assert.ok(chunkEvent);
    assert.equal(chunkEvent.chunk, undefined);
    assert.equal(chunkEvent.value, undefined);
    assert.equal(chunkEvent.chunkCount, 1);
    assert.equal(inspector.streams()[0]?.name, 'metadata-only');
    assert.equal(inspector.stream('metadata-only')()?.value, undefined);
  } finally {
    inspector.dispose();
    globalThis.__QORE_DEVTOOLS__ = previousHook;
  }
});

test('createStreamInspector reports latency and live stream status before completion', async () => {
  const previousHook = globalThis.__QORE_DEVTOOLS__;
  const inspector = createStreamInspector();

  try {
    const answer = stream(async ({ push, signal }) => {
      await sleep(5, signal);
      await push('first');
      await sleep(20, signal);
      await push(' second');
    }, { name: 'timed-answer' });

    await sleep(10);

    const liveStream = inspector.stream('timed-answer')();
    assert.ok(liveStream);
    assert.equal(liveStream.terminal, false);
    assert.equal(liveStream.chunkCount, 1);
    assert.ok((liveStream.firstChunkLatencyMs ?? -1) >= 0);

    await answer.ready;

    const completedStream = inspector.stream('timed-answer')();
    assert.ok(completedStream);
    assert.equal(completedStream.terminal, true);
    assert.equal(completedStream.status, 'completed');
    assert.equal(completedStream.chunkCount, 2);
    assert.ok((completedStream.durationMs ?? 0) >= (completedStream.firstChunkLatencyMs ?? 0));
    assert.ok((completedStream.chunksPerSecond ?? 0) > 0);
  } finally {
    inspector.dispose();
    globalThis.__QORE_DEVTOOLS__ = previousHook;
  }
});

test('stream.from exposes the delayed source helper on the factory', async () => {
  const answer = stream.from(['a', 'b'], { delay: 1 });

  assert.equal(await answer.ready, 'ab');
  assert.equal(answer(), 'ab');
});

test('stream.latest keeps only the newest chunk as its signal value', async () => {
  const answer = stream.latest(async ({ push }) => {
    push('old');
    push('new');
  });

  await answer.ready;

  assert.equal(answer(), 'new');
  assert.deepEqual(answer.chunks(), ['old', 'new']);
});

test('stream.events exposes typed event timelines as signal state', async () => {
  type AgentEvent =
    | { type: 'status'; value: 'thinking' | 'done' }
    | { type: 'text'; text: string }
    | { type: 'tool_call'; name: string };

  const events = stream.events<AgentEvent>(async ({ push }) => {
    await push({ type: 'status', value: 'thinking' });
    await push({ type: 'tool_call', name: 'search' });
    await push({ type: 'text', text: 'stream ' });
    await push({ type: 'text', text: 'runtime' });
    await push({ type: 'status', value: 'done' });
  });
  const textEvents = events.select('text');
  const statusEvents = events.select('status');

  await Promise.all([events.ready, textEvents.ready, statusEvents.ready]);

  assert.deepEqual(events().map((event) => event.type), ['status', 'tool_call', 'text', 'text', 'status']);
  assert.deepEqual(textEvents(), [
    { type: 'text', text: 'stream ' },
    { type: 'text', text: 'runtime' }
  ]);
  assert.deepEqual(statusEvents(), [
    { type: 'status', value: 'thinking' },
    { type: 'status', value: 'done' }
  ]);
});

test('stream.events select can reduce one event type into UI-ready state', async () => {
  type AgentEvent =
    | { type: 'text'; text: string }
    | { type: 'diff'; patch: string };

  const events = stream.events<AgentEvent>([
    { type: 'text', text: 'Qore ' },
    { type: 'diff', patch: '+stream.events' },
    { type: 'text', text: 'selects streams.' }
  ]);
  const text = events.select('text', {
    seed: '',
    reduce: (currentValue, event) => currentValue + event.text
  });
  const diff = events.select('diff');

  await Promise.all([events.ready, text.ready, diff.ready]);

  assert.equal(text(), 'Qore selects streams.');
  assert.deepEqual(diff(), [{ type: 'diff', patch: '+stream.events' }]);
});

test('stream.events select replays event history when created after completion', async () => {
  const events = stream.events([
    { type: 'status', value: 'queued' },
    { type: 'status', value: 'done' }
  ] as const);

  await events.ready;

  const status = events.select('status');
  await status.ready;

  assert.deepEqual(status(), [
    { type: 'status', value: 'queued' },
    { type: 'status', value: 'done' }
  ]);
});

test('stream.merge interleaves multiple sources into one signal surface', async () => {
  const merged = stream.merge([
    (async function* () {
      await sleep(2);
      yield 'A';
      await sleep(6);
      yield 'C';
    })(),
    (async function* () {
      await sleep(4);
      yield 'B';
    })()
  ]);

  await merged.ready;

  assert.equal(merged(), 'ABC');
  assert.deepEqual(merged.chunks(), ['A', 'B', 'C']);
});

test('stream.concat drains sources in sequence', async () => {
  const concatenated = stream.concat([
    (async function* first() {
      yield 'A';
      await sleep(2);
      yield 'B';
    })(),
    (async function* second() {
      yield 'C';
      await sleep(1);
      yield 'D';
    })()
  ]);

  await concatenated.ready;

  assert.equal(concatenated(), 'ABCD');
  assert.deepEqual(concatenated.chunks(), ['A', 'B', 'C', 'D']);
});

test('stream.pipe feeds each completed value into the next stage', async () => {
  const piped = stream.pipe(['Qore'], [
    async (value) => [value.toUpperCase()],
    async (value) => [` ${value.length}`]
  ]);

  await piped.ready;

  assert.equal(piped(), 'QoreQORE 4');
  assert.deepEqual(piped.chunks(), ['Qore', 'QORE', ' 4']);
});

test('stream.race stays on the first source that produces a chunk', async () => {
  const raced = stream.race([
    (async function* () {
      await sleep(12);
      yield 'slow';
    })(),
    (async function* () {
      await sleep(1);
      yield 'fast';
      await sleep(1);
      yield ' winner';
    })()
  ]);

  await raced.ready;

  assert.equal(raced(), 'fast winner');
  assert.deepEqual(raced.chunks(), ['fast', ' winner']);
});

test('stream.retryable retries failed sources before succeeding', async () => {
  let attempts = 0;
  const retried = stream.retryable(() => async ({ push }) => {
    attempts += 1;

    if (attempts < 3) {
      throw new Error(`attempt ${attempts} failed`);
    }

    await push('Qore');
  }, {
    maxRetries: 2,
    backoff: 0
  });

  await retried.ready;

  assert.equal(attempts, 3);
  assert.equal(retried(), 'Qore');
});

test('stream.retryable surfaces the final error after exhausting retries', async () => {
  let attempts = 0;
  const retried = stream.retryable(() => async () => {
    attempts += 1;
    throw new Error(`attempt ${attempts} failed`);
  }, {
    maxRetries: 1,
    backoff: 0
  });

  await assert.rejects(retried.ready, /attempt 2 failed/);
  assert.equal(attempts, 2);
  assert.equal(retried.status(), 'error');
});

test('stream.switchMap keeps only the latest mapped stream active', async () => {
  const switched = stream.switchMap([
    { label: 'first', delay: 10, parts: ['old'] },
    { label: 'second', delay: 1, parts: ['new', ' value'] }
  ], async (entry) => (async function* latestOnly() {
    await sleep(entry.delay);

    for (const part of entry.parts) {
      yield part;
      await sleep(1);
    }
  })());

  await switched.ready;

  assert.equal(switched(), 'new value');
  assert.deepEqual(switched.chunks(), ['new', ' value']);
});

test('stream.switchMap can follow prompt churn without leaking stale chunks', async () => {
  const prompts = (async function* promptSequence() {
    yield 'alpha';
    await sleep(2);
    yield 'beta';
  })();
  const switched = stream.switchMap(prompts, async (prompt) => (async function* answer() {
    yield `${prompt}:1`;
    await sleep(prompt === 'alpha' ? 8 : 1);
    yield `${prompt}:2`;
  })());

  await switched.ready;

  assert.deepEqual(switched.chunks(), ['alpha:1', 'beta:1', 'beta:2']);
  assert.equal(switched(), 'alpha:1beta:1beta:2');
});

// paced streams should visibly space out chunk delivery for streaming UIs.
test('stream.paced spaces chunk delivery over time', async () => {
  const timestamps: number[] = [];
  const answer = stream.paced(async ({ push }) => {
    await sleep(0);
    await push('Q');
    await push('o');
    await push('re');
  }, 12);

  answer.subscribe(() => {
    timestamps.push(Date.now());
  }, { immediate: false });

  const startedAt = Date.now();
  await answer.ready;
  const elapsed = Date.now() - startedAt;

  assert.equal(answer(), 'Qore');
  assert.equal(timestamps.length, 3);
  assert.ok(elapsed >= 24);
  assert.ok(timestamps[1]! - timestamps[0]! >= 8);
  assert.ok(timestamps[2]! - timestamps[1]! >= 8);
});

// Iterable sources should honor the same backpressure behavior as manual producers.
test('stream.withBackpressure applies pacing to iterable sources too', async () => {
  const startedAt = Date.now();
  const answer = stream.withBackpressure(['stream', 'ing', '-', 'first'], 10);

  await answer.ready;

  assert.equal(answer(), 'streaming-first');
  assert.ok(Date.now() - startedAt >= 30);
});

// Unawaited producer writes should still enter the UI one chunk at a time under pacing.
test('stream.withBackpressure serializes manual pushes even without awaiting push', async () => {
  const timestamps: number[] = [];
  const answer = stream.withBackpressure(async ({ push }) => {
    push('Q');
    push('o');
    push('re');
  }, { interval: 12 });

  answer.subscribe(() => {
    timestamps.push(Date.now());
  }, { immediate: false });

  const startedAt = Date.now();
  await answer.ready;

  assert.equal(answer(), 'Qore');
  assert.equal(timestamps.length, 3);
  assert.ok(Date.now() - startedAt >= 20);
  assert.ok(timestamps[1]! - timestamps[0]! >= 8);
  assert.ok(timestamps[2]! - timestamps[1]! >= 8);
});

// Overflow strategies should be able to trim buffered chunks while exposing what was dropped.
test('stream.withBackpressure can drop older buffered chunks on overflow', async () => {
  const answer = stream.withBackpressure(async ({ push }) => {
    push('A');
    push('B');
    push('C');
  }, {
    interval: 12,
    buffer: 1,
    overflow: 'drop-oldest'
  });

  await answer.ready;

  assert.equal(answer(), 'AC');
  assert.equal(answer.buffered(), 0);
  assert.equal(answer.dropped(), 1);
});

// External aborts should clear any buffered writes instead of leaving producer promises hanging.
test('stream abort flushes queued writes created by unawaited producers', async () => {
  const answer = stream.withBackpressure(async ({ push }) => {
    push('A');
    push('B');
    push('C');
  }, { interval: 18, buffer: 2 });

  await sleep(4);
  answer.abort();
  await answer.ready;

  assert.equal(answer.status(), 'aborted');
  assert.equal(answer.buffered(), 0);
  assert.equal(answer(), 'A');
});

// Overflow errors should reject ready and expose the lifecycle failure cleanly.
test('stream.withBackpressure surfaces overflow errors through ready and status', async () => {
  const answer = stream.withBackpressure(async ({ push }) => {
    push('A');
    push('B');
    push('C');
  }, {
    interval: 18,
    buffer: 1,
    overflow: 'error'
  });

  await assert.rejects(answer.ready, /buffer overflow/);

  assert.equal(answer.status(), 'error');
  assert.equal(answer.error()?.message, 'Qore stream backpressure buffer overflow');
  assert.equal(answer.buffered(), 0);
});

// High-volume queued writes should still drain into one consistent final signal value.
test('stream.withBackpressure preserves long queued histories under wait overflow', async () => {
  const chunks = Array.from({ length: 120 }, (_, index) => `${index},`);
  const answer = stream.withBackpressure(async ({ push }) => {
    for (const chunk of chunks) {
      push(chunk);
    }
  }, {
    interval: 0,
    buffer: 6,
    overflow: 'wait'
  });

  await answer.ready;

  assert.equal(answer.status(), 'completed');
  assert.equal(answer.buffered(), 0);
  assert.equal(answer.dropped(), 0);
  assert.equal(answer.chunkCount(), chunks.length);
  assert.equal(answer(), chunks.join(''));
});

// Derived streams should preserve the chunk-by-chunk composition model.
test('mapStream transforms a source stream', async () => {
  const source = stream<number>(async ({ push }) => {
    push(1);
    push(2);
    push(3);
  });

  const mapped = mapStream(source, (value) => value * 10);
  const chunks: number[] = [];

  for await (const chunk of mapped) {
    chunks.push(chunk);
  }

  assert.deepEqual(chunks, [10, 20, 30]);
});

// scanStream should emit the running reduction after each source chunk.
test('scanStream turns a stream into a running reduction', async () => {
  const source = stream<number>(async ({ push }) => {
    push(1);
    push(2);
    push(3);
  });

  const scanned = scanStream(source, (total, value) => total + value, 0);
  const totals: number[] = [];

  for await (const total of scanned) {
    totals.push(total);
  }

  assert.deepEqual(totals, [1, 3, 6]);
});
