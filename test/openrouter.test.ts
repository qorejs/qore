import test from 'node:test';
import assert from 'node:assert/strict';

import { createOpenRouter } from '../src/index.js';
import type { OpenRouterEvent } from '../src/providers/types.js';

const encoder = new TextEncoder();

function createSSEBody(events: OpenRouterEvent[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    }
  });
}

test('createOpenRouter chat streams text deltas from the chat completions API', async () => {
  const calls: Array<{
    url: string | URL | Request;
    body: Record<string, unknown>;
    method?: string;
    headers?: HeadersInit;
  }> = [];
  const openrouter = createOpenRouter({
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
        { id: 'chat_1', choices: [{ index: 0, delta: { content: ' Router' } }] },
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

  for await (const chunk of openrouter.chat('Why stream should be signal?', {
    model: 'openai/gpt-4.1-mini',
    temperature: 0.2
  })) {
    chunks.push(chunk);
  }

  assert.deepEqual(chunks, ['Hello', ' Router']);
  assert.equal(calls.length, 1);
  const [call] = calls;
  assert.ok(call);
  assert.equal(call.url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(call.method, 'POST');
  const headers = call.headers as Record<string, string>;
  assert.equal(headers['Authorization'], 'Bearer test-key');
  assert.equal(call.body['model'], 'openai/gpt-4.1-mini');
  assert.equal(call.body['stream'], true);
  assert.equal(call.body['temperature'], 0.2);
  assert.deepEqual(call.body['messages'], [{ role: 'user', content: 'Why stream should be signal?' }]);
});

test('createOpenRouter chatCompletions.stream yields typed events', async () => {
  const openrouter = createOpenRouter({
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

  for await (const event of openrouter.chatCompletions.stream({
    messages: [{ role: 'user', content: 'hello' }]
  })) {
    seen.push(event.choices?.length ?? 0);
  }

  assert.deepEqual(seen, [1, 1, 1]);
});

test('createOpenRouter surfaces provider HTTP errors clearly', async () => {
  const openrouter = createOpenRouter({
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

  const iterator = openrouter.chat('hello')[Symbol.asyncIterator]();

  await assert.rejects(() => iterator.next(), /Invalid API key/);
});

test('createOpenRouter does not assume process exists when API keys are missing', () => {
  const runtime = globalThis as unknown as { process: typeof process | undefined };
  const originalProcess = runtime.process;

  try {
    runtime.process = undefined;

    assert.throws(
      () => createOpenRouter({ fetch: async () => new Response(null) }),
      /requires an API key/
    );
  } finally {
    runtime.process = originalProcess;
  }
});
