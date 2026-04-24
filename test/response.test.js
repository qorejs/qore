import test from 'node:test';
import assert from 'node:assert/strict';

import { response, sleep, stream } from '../src/index.js';

test('text response accumulates chunks and closes as completed', async () => {
  const answer = response.text();

  await answer.run(async ({ push }) => {
    push('流');
    push('式');
    push('响应');
  });

  assert.equal(answer.status(), 'completed');
  assert.equal(answer.value(), '流式响应');
  assert.deepEqual(answer.chunks(), ['流', '式', '响应']);
  assert.equal(answer.chunkCount(), 3);
});

test('response can consume any async iterable stream', async () => {
  const answer = response.list();

  await answer.consume(stream(async ({ push }) => {
    push({ step: 1 });
    push({ step: 2 });
  }));

  assert.equal(answer.status(), 'completed');
  assert.deepEqual(answer.value(), [{ step: 1 }, { step: 2 }]);
});

test('response abort keeps the chunks received so far', async () => {
  const answer = response.text();

  const run = answer.run(async ({ push, signal }) => {
    push('流');
    await sleep(50, signal);
    push('式');
  });

  await sleep(10);
  answer.abort();
  await run;

  assert.equal(answer.status(), 'aborted');
  assert.equal(answer.value(), '流');
});

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
