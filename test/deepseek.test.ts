import test from 'node:test';
import assert from 'node:assert/strict';

import { createDeepSeek } from '../src/index.js';
import type { DeepSeekEvent } from '../src/providers/types.js';
import { createPendingSSEBody, createSSEBody } from './provider-sse-test-helpers.js';

test('createDeepSeek chat streams text deltas from the chat completions API', async () => {
  const calls: Array<{
    url: string | URL | Request;
    body: Record<string, unknown>;
    method?: string;
    headers?: HeadersInit;
  }> = [];
  const deepseek = createDeepSeek({
    apiKey: 'test-key',
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

      return new Response(createSSEBody([
        { id: 'chat_1', choices: [{ index: 0, delta: { role: 'assistant' } }] },
        { id: 'chat_1', choices: [{ index: 0, delta: { content: 'Hello' } }] },
        { id: 'chat_1', choices: [{ index: 0, delta: { content: ' DeepSeek' } }] },
        { id: 'chat_1', choices: [{ index: 0, finish_reason: 'stop', delta: {} }] }
      ]), {
        status: 200,
        headers: {
          'content-type': 'text/event-stream'
        }
      });
    }
  });

  const chunks: string[] = [];

  for await (const chunk of deepseek.chat('Why stream should be signal?', {
    model: 'deepseek-reasoner',
    temperature: 0.2
  })) {
    chunks.push(chunk);
  }

  assert.deepEqual(chunks, ['Hello', ' DeepSeek']);
  assert.equal(calls.length, 1);
  const [call] = calls;
  assert.ok(call);
  assert.equal(call.url, 'https://api.deepseek.com/chat/completions');
  assert.equal(call.method, 'POST');
  const headers = call.headers as Record<string, string>;
  assert.equal(headers['Authorization'], 'Bearer test-key');
  assert.equal(call.body['model'], 'deepseek-reasoner');
  assert.equal(call.body['stream'], true);
  assert.equal(call.body['temperature'], 0.2);
  assert.deepEqual(call.body['messages'], [{ role: 'user', content: 'Why stream should be signal?' }]);
});

test('createDeepSeek chatCompletions.stream yields typed events', async () => {
  const deepseek = createDeepSeek({
    apiKey: 'test-key',
    fetch: async () => new Response(createSSEBody([
      { id: 'chat_2', choices: [{ index: 0, delta: { role: 'assistant' } }] },
      { id: 'chat_2', choices: [{ index: 0, delta: { content: 'A' } }] },
      { id: 'chat_2', choices: [{ index: 0, finish_reason: 'stop', delta: {} }] }
    ]), {
      status: 200,
      headers: {
        'content-type': 'text/event-stream'
      }
    })
  });

  const seen: number[] = [];

  for await (const event of deepseek.chatCompletions.stream({
    messages: [{ role: 'user', content: 'hello' }]
  })) {
    seen.push(event.choices?.length ?? 0);
  }

  assert.deepEqual(seen, [1, 1, 1]);
});

test('createDeepSeek surfaces provider HTTP errors clearly', async () => {
  const deepseek = createDeepSeek({
    apiKey: 'bad-key',
    fetch: async () => new Response(JSON.stringify({
      error: {
        message: 'Invalid API key'
      }
    }), {
      status: 401,
      headers: {
        'content-type': 'application/json'
      }
    })
  });

  const iterator = deepseek.chat('hello')[Symbol.asyncIterator]();

  await assert.rejects(() => iterator.next(), /Invalid API key/);
});

test('createDeepSeek does not assume process exists when API keys are missing', () => {
  const runtime = globalThis as unknown as { process: typeof process | undefined };
  const originalProcess = runtime.process;

  try {
    runtime.process = undefined;

    assert.throws(
      () => createDeepSeek({ fetch: async () => new Response(null) }),
      /requires an API key/
    );
  } finally {
    runtime.process = originalProcess;
  }
});

test('createDeepSeek does not start fetch work when the request signal is already aborted', async () => {
  let calls = 0;
  const controller = new AbortController();
  controller.abort('deepseek stop now');
  const deepseek = createDeepSeek({
    apiKey: 'test-key',
    fetch: async () => {
      calls += 1;
      return new Response(null, { status: 200 });
    }
  });

  const iterator = deepseek.chat('hello', { signal: controller.signal })[Symbol.asyncIterator]();

  await assert.rejects(() => iterator.next(), /deepseek stop now/);
  assert.equal(calls, 0);
});

test('createDeepSeek cancels the active reader when the request signal aborts mid-stream', async () => {
  const controller = new AbortController();
  const pendingBody = createPendingSSEBody([
    { id: 'chat_3', choices: [{ index: 0, delta: { role: 'assistant' } }] },
    { id: 'chat_3', choices: [{ index: 0, delta: { content: 'hello' } }] }
  ]);
  const deepseek = createDeepSeek({
    apiKey: 'test-key',
    fetch: async () => new Response(pendingBody.body, {
      status: 200,
      headers: {
        'content-type': 'text/event-stream'
      }
    })
  });

  const iterator = deepseek.chat('hello', { signal: controller.signal })[Symbol.asyncIterator]();
  const first = await iterator.next();
  assert.deepEqual(first, { done: false, value: 'hello' });

  const nextChunk = iterator.next();
  controller.abort('deepseek stream cancelled');

  await assert.rejects(() => nextChunk, /deepseek stream cancelled/);
  await assert.doesNotReject(() => pendingBody.cancelled);
});
