import test from 'node:test';
import assert from 'node:assert/strict';

import { mapStream, scanStream, sleep, stream } from '../src/index.js';

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
test('stream.latest keeps only the newest chunk as its signal value', async () => {
  const answer = stream.latest(async ({ push }) => {
    push('old');
    push('new');
  });

  await answer.ready;

  assert.equal(answer(), 'new');
  assert.deepEqual(answer.chunks(), ['old', 'new']);
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
