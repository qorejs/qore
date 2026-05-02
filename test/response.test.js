import test from 'node:test';
import assert from 'node:assert/strict';

import { response, sleep, stream } from '../src/index.js';

// Verify the text reducer and lifecycle flags on the base response primitive.
test('text response accumulates chunks and closes as completed', async () => {
  const answer = response.text();

  await answer.run(async ({ push }) => {
    push('stream');
    push('ing');
    push('-first');
  });

  assert.equal(answer.status(), 'completed');
  assert.equal(answer.value(), 'streaming-first');
  assert.deepEqual(answer.chunks(), ['stream', 'ing', '-first']);
  assert.equal(answer.chunkCount(), 3);
});

// A response should be able to consume a stream without flattening structured chunks.
test('response can consume any async iterable stream', async () => {
  const answer = response.list();

  await answer.consume(stream(async ({ push }) => {
    push({ step: 1 });
    push({ step: 2 });
  }));

  assert.equal(answer.status(), 'completed');
  assert.deepEqual(answer.value(), [{ step: 1 }, { step: 2 }]);
});

// Aborting should stop the response while preserving everything accumulated so far.
test('response abort keeps the chunks received so far', async () => {
  const answer = response.text();

  const run = answer.run(async ({ push, signal }) => {
    push('stream');
    await sleep(50, signal);
    push('ing');
  });

  await sleep(10);
  answer.abort();
  await run;

  assert.equal(answer.status(), 'aborted');
  assert.equal(answer.value(), 'stream');
});

// Starting a newer run should supersede the old one at the lifecycle level.
test('a new run supersedes the previous one', async () => {
  const answer = response.text();

  const firstRun = answer.run(async ({ push, signal }) => {
    push('old');
    await sleep(50, signal);
    push(' value');
  });

  const secondRun = answer.run(async ({ push }) => {
    push('new');
  });

  await Promise.all([firstRun, secondRun]);

  assert.equal(answer.status(), 'completed');
  assert.equal(answer.value(), 'new');
});

// Even stale executors should be prevented from leaking late writes into the latest run.
test('superseded runs cannot leak stale chunks into the latest response', async () => {
  const answer = response.text();
  let releaseFirstRun;

  const firstRun = answer.run(async ({ push }) => {
    await new Promise((resolve) => {
      releaseFirstRun = () => {
        push('stale');
        resolve();
      };
    });
  });

  await sleep(0);

  const secondRun = answer.run(async ({ push }) => {
    push('fresh');
  });

  await secondRun;
  releaseFirstRun();
  await firstRun;

  assert.equal(answer.status(), 'completed');
  assert.equal(answer.value(), 'fresh');
  assert.deepEqual(answer.chunks(), ['fresh']);
});

// Finished responses should not let late failures override their terminal state.
test('fail cannot override a completed response', () => {
  const answer = response.text();

  answer.push('done');
  answer.complete();
  const result = answer.fail('boom');

  assert.equal(result, 'done');
  assert.equal(answer.status(), 'completed');
  assert.equal(answer.value(), 'done');
  assert.equal(answer.error(), null);
});

// Snapshots should be safe to inspect without exposing the live internal chunk array.
test('snapshot returns a defensive copy of chunks', () => {
  const answer = response.list();

  answer.push({ step: 1 });

  const snap = answer.snapshot();
  snap.chunks.push({ step: 2 });

  assert.deepEqual(answer.chunks(), [{ step: 1 }]);
  assert.equal(answer.chunkCount(), 1);
});
