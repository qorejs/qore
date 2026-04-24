import test from 'node:test';
import assert from 'node:assert/strict';

import { mapStream, scanStream, stream } from '../src/index.js';

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

test('stream yields chunks pushed by the producer', async () => {
  const source = stream(async ({ push }) => {
    push('流');
    push('式');
    push('响应');
  });

  const chunks = [];

  for await (const chunk of source) {
    chunks.push(chunk);
  }

  assert.deepEqual(chunks, ['流', '式', '响应']);
});

test('stream.list keeps structured chunks in signal form', async () => {
  const feed = stream.list(async ({ push }) => {
    push({ step: 1 });
    push({ step: 2 });
  });

  await feed.ready;

  assert.deepEqual(feed(), [{ step: 1 }, { step: 2 }]);
});

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
