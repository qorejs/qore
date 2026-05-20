import test from 'node:test';
import assert from 'node:assert/strict';

import { createOllama } from '../src/index.js';
import { createLineBody, createPendingLineBody } from './provider-line-test-helpers.js';

test('createOllama chat streams message deltas from the chat API', async () => {
  const calls: Array<{
    url: string | URL | Request;
    body: Record<string, unknown>;
    method?: string;
    headers?: HeadersInit;
  }> = [];
  const ollama = createOllama({
    model: 'qwen3:4b',
    fetch: async (url, init) => {
      const call = {
        url,
        body: JSON.parse(String(init?.body))
      } as {
        url: string | URL | Request;
        body: Record<string, unknown>;
        method?: string;
        headers?: HeadersInit;
      };

      if (init?.method) {
        call.method = init.method;
      }

      if (init?.headers) {
        call.headers = init.headers;
      }

      calls.push(call);

      return new Response(createLineBody([
        { model: 'qwen3:4b', message: { role: 'assistant', content: 'Local' }, done: false },
        { model: 'qwen3:4b', message: { role: 'assistant', content: ' first' }, done: false },
        { model: 'qwen3:4b', done: true, done_reason: 'stop' }
      ]), {
        status: 200,
        headers: {
          'content-type': 'application/x-ndjson'
        }
      });
    }
  });

  const chunks: string[] = [];

  for await (const chunk of ollama.chat('Why should stream become signal?', {
    temperature: 0.1
  })) {
    chunks.push(chunk);
  }

  assert.deepEqual(chunks, ['Local', ' first']);
  assert.equal(calls.length, 1);
  const [call] = calls;
  assert.ok(call);
  assert.equal(call.url, 'http://127.0.0.1:11434/api/chat');
  assert.equal(call.method, 'POST');
  const headers = call.headers as Record<string, string>;
  assert.equal(headers['Content-Type'], 'application/json');
  assert.equal(call.body['model'], 'qwen3:4b');
  assert.equal(call.body['stream'], true);
  assert.equal(call.body['temperature'], 0.1);
  assert.deepEqual(call.body['messages'], [{ role: 'user', content: 'Why should stream become signal?' }]);
});

test('createOllama stream yields typed events', async () => {
  const ollama = createOllama({
    fetch: async () => new Response(createLineBody([
      { model: 'llama3.2', message: { role: 'assistant', content: 'A' }, done: false },
      { model: 'llama3.2', done: true, done_reason: 'stop' }
    ]), {
      status: 200,
      headers: {
        'content-type': 'application/x-ndjson'
      }
    })
  });

  const doneStates: boolean[] = [];

  for await (const event of ollama.stream({
    messages: [{ role: 'user', content: 'hello' }]
  })) {
    doneStates.push(Boolean(event.done));
  }

  assert.deepEqual(doneStates, [false, true]);
});

test('createOllama surfaces provider HTTP errors clearly', async () => {
  const ollama = createOllama({
    fetch: async () => new Response(JSON.stringify({
      error: 'model not found'
    }), {
      status: 404,
      headers: {
        'content-type': 'application/json'
      }
    })
  });

  const iterator = ollama.chat('hello')[Symbol.asyncIterator]();

  await assert.rejects(() => iterator.next(), /model not found/);
});

test('createOllama does not start fetch work when the request signal is already aborted', async () => {
  let calls = 0;
  const controller = new AbortController();
  controller.abort('ollama stop now');
  const ollama = createOllama({
    fetch: async () => {
      calls += 1;
      return new Response(null, { status: 200 });
    }
  });

  const iterator = ollama.chat('hello', { signal: controller.signal })[Symbol.asyncIterator]();

  await assert.rejects(() => iterator.next(), /ollama stop now/);
  assert.equal(calls, 0);
});

test('createOllama cancels the active reader when the request signal aborts mid-stream', async () => {
  const controller = new AbortController();
  const pendingBody = createPendingLineBody([
    { model: 'llama3.2', message: { role: 'assistant', content: 'hello' }, done: false }
  ]);
  const ollama = createOllama({
    fetch: async () => new Response(pendingBody.body, {
      status: 200,
      headers: {
        'content-type': 'application/x-ndjson'
      }
    })
  });

  const iterator = ollama.chat('hello', { signal: controller.signal })[Symbol.asyncIterator]();
  const first = await iterator.next();
  assert.deepEqual(first, { done: false, value: 'hello' });

  const nextChunk = iterator.next();
  controller.abort('ollama stream cancelled');

  await assert.rejects(() => nextChunk, /ollama stream cancelled/);
  await assert.doesNotReject(() => pendingBody.cancelled);
});
