import test from 'node:test';
import assert from 'node:assert/strict';

import { createOpenAI } from '../src/index.js';
import type { OpenAIEvent } from '../src/providers/types.js';
import { createPendingSSEBody, createSSEBody } from './provider-sse-test-helpers.js';

test('createOpenAI chat streams text deltas from the Responses API', async () => {
  const calls: Array<{
    url: string | URL | Request;
    body: Record<string, unknown>;
    method?: string;
    headers?: HeadersInit;
  }> = [];
  const openai = createOpenAI({
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
        { type: 'response.created', response: { id: 'resp_1' } },
        { type: 'response.output_text.delta', delta: 'Hello' },
        { type: 'response.output_text.delta', delta: ' Qore' },
        { type: 'response.completed', response: { id: 'resp_1' } }
      ]), {
        status: 200,
        headers: {
          'content-type': 'text/event-stream'
        }
      });
    }
  });

  const chunks: string[] = [];

  for await (const chunk of openai.chat('Why stream should be signal?', {
    model: 'gpt-5',
    instructions: 'Keep it short.'
  })) {
    chunks.push(chunk);
  }

  assert.deepEqual(chunks, ['Hello', ' Qore']);
  assert.equal(calls.length, 1);
  const [call] = calls;
  assert.ok(call);
  assert.equal(call.url, 'https://api.openai.com/v1/responses');
  assert.equal(call.method, 'POST');
  const headers = call.headers as Record<string, string>;
  assert.equal(headers['Authorization'], 'Bearer test-key');
  assert.equal(call.body['model'], 'gpt-5');
  assert.equal(call.body['stream'], true);
  assert.equal(call.body['instructions'], 'Keep it short.');
  assert.deepEqual(call.body['input'], [{ role: 'user', content: 'Why stream should be signal?' }]);
});

test('createOpenAI responses.stream yields typed events', async () => {
  const openai = createOpenAI({
    apiKey: 'test-key',
    fetch: async () => new Response(createSSEBody([
      { type: 'response.created', response: { id: 'resp_2' } },
      { type: 'response.output_text.delta', delta: 'A' },
      { type: 'response.completed', response: { id: 'resp_2' } }
    ]), {
      status: 200,
      headers: {
        'content-type': 'text/event-stream'
      }
    })
  });

  const seen: string[] = [];

  for await (const event of openai.responses.stream({ input: 'hello' })) {
    seen.push(event.type);
  }

  assert.deepEqual(seen, ['response.created', 'response.output_text.delta', 'response.completed']);
});

test('createOpenAI surfaces provider HTTP errors clearly', async () => {
  const openai = createOpenAI({
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

  const iterator = openai.chat('hello')[Symbol.asyncIterator]();

  await assert.rejects(() => iterator.next(), /Invalid API key/);
});

test('createOpenAI does not assume process exists when API keys are missing', () => {
  const runtime = globalThis as unknown as { process: typeof process | undefined };
  const originalProcess = runtime.process;

  try {
    runtime.process = undefined;

    assert.throws(
      () => createOpenAI({ fetch: async () => new Response(null) }),
      /requires an API key/
    );
  } finally {
    runtime.process = originalProcess;
  }
});

test('createOpenAI does not start fetch work when the request signal is already aborted', async () => {
  let calls = 0;
  const controller = new AbortController();
  controller.abort('openai stop now');
  const openai = createOpenAI({
    apiKey: 'test-key',
    fetch: async () => {
      calls += 1;
      return new Response(null, { status: 200 });
    }
  });

  const iterator = openai.chat('hello', { signal: controller.signal })[Symbol.asyncIterator]();

  await assert.rejects(() => iterator.next(), /openai stop now/);
  assert.equal(calls, 0);
});

test('createOpenAI cancels the active reader when the request signal aborts mid-stream', async () => {
  const controller = new AbortController();
  const pendingBody = createPendingSSEBody([
    { type: 'response.created', response: { id: 'resp_3' } },
    { type: 'response.output_text.delta', delta: 'hello' }
  ]);
  const openai = createOpenAI({
    apiKey: 'test-key',
    fetch: async () => new Response(pendingBody.body, {
      status: 200,
      headers: {
        'content-type': 'text/event-stream'
      }
    })
  });

  const iterator = openai.chat('hello', { signal: controller.signal })[Symbol.asyncIterator]();
  const first = await iterator.next();
  assert.deepEqual(first, { done: false, value: 'hello' });

  const nextChunk = iterator.next();
  controller.abort('openai stream cancelled');

  await assert.rejects(() => nextChunk, /openai stream cancelled/);
  await assert.doesNotReject(() => pendingBody.cancelled);
});
