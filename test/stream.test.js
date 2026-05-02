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
  const source = stream(async ({ push }) => {
    push('stream');
    push('ing');
    push('-first');
  });

  const chunks = [];

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
  const source = stream(async ({ push }) => {
    push('stream');
    push('ing');
    push('-first');
  });

  const mirrored = stream(source);

  await Promise.all([source.ready, mirrored.ready]);

  assert.equal(mirrored(), 'streaming-first');
  assert.deepEqual(mirrored.chunks(), ['stream', 'ing', '-first']);
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
  assert.equal(answer.error().message, 'boom');
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

// paced streams should visibly space out chunk delivery for streaming UIs.
test('stream.paced spaces chunk delivery over time', async () => {
  const timestamps = [];
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
  assert.ok(timestamps[1] - timestamps[0] >= 8);
  assert.ok(timestamps[2] - timestamps[1] >= 8);
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
  const timestamps = [];
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
  assert.ok(timestamps[1] - timestamps[0] >= 8);
  assert.ok(timestamps[2] - timestamps[1] >= 8);
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

// Derived streams should preserve the chunk-by-chunk composition model.
test('mapStream transforms a source stream', async () => {
  const source = stream(async ({ push }) => {
    push(1);
    push(2);
    push(3);
  });

  const mapped = mapStream(source, (value) => value * 10);
  const chunks = [];

  for await (const chunk of mapped) {
    chunks.push(chunk);
  }

  assert.deepEqual(chunks, [10, 20, 30]);
});

// scanStream should emit the running reduction after each source chunk.
test('scanStream turns a stream into a running reduction', async () => {
  const source = stream(async ({ push }) => {
    push(1);
    push(2);
    push(3);
  });

  const scanned = scanStream(source, (total, value) => total + value, 0);
  const totals = [];

  for await (const total of scanned) {
    totals.push(total);
  }

  assert.deepEqual(totals, [1, 3, 6]);
});
