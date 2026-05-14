import test from 'node:test';
import assert from 'node:assert/strict';

import { createSSEAdapter } from '../src/index.js';
import type { SSEEvent } from '../src/providers/types.js';

const encoder = new TextEncoder();

// Turn event payloads into a tiny text/event-stream body for adapter tests.
function createSSEBody(chunks: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }

      controller.close();
    }
  });
}

test('createSSEAdapter can map a custom chat endpoint into stream(provider.chat(...))', async () => {
  const calls: Array<{
    url: string | URL | Request;
    method?: string;
    headers?: HeadersInit;
    body: Record<string, unknown>;
  }> = [];
  const provider = createSSEAdapter<{ prompt: string }, string, { type?: string; text?: string }>({
    name: 'Generic Chat',
    url: 'https://example.com/stream',
    headers: {
      Authorization: 'Bearer generic-key'
    },
    fetch: async (url, init) => {
      calls.push({
        url,
        method: init?.method,
        headers: init?.headers,
        body: JSON.parse(String(init?.body))
      });

      return new Response(createSSEBody([
        'event: token\n',
        'data: {"type":"token","text":"Hello"}\n\n',
        'event: token\n',
        'data: {"type":"token","text":" SSE"}\n\n'
      ]), {
        status: 200,
        headers: {
          'content-type': 'text/event-stream'
        }
      });
    },
    buildRequest(request) {
      return {
        method: 'POST',
        body: JSON.stringify(request)
      };
    },
    buildChatRequest(input) {
      return {
        prompt: input
      };
    },
    eventToText: (event) => event.data?.type === 'token' ? event.data.text : undefined
  });

  const chunks: string[] = [];

  for await (const chunk of provider.chat('hello world')) {
    chunks.push(chunk);
  }

  assert.deepEqual(chunks, ['Hello', ' SSE']);
  assert.equal(calls.length, 1);
  const [call] = calls;
  assert.ok(call);
  assert.equal(call.url, 'https://example.com/stream');
  assert.equal(call.method, 'POST');
  const headers = call.headers as Record<string, string>;
  assert.equal(headers.Authorization, 'Bearer generic-key');
  assert.deepEqual(call.body, { prompt: 'hello world' });
});

test('createSSEAdapter stream preserves raw SSE metadata alongside parsed data', async () => {
  const provider = createSSEAdapter<Record<string, unknown>, unknown, { text: string }>({
    name: 'Generic Events',
    url: 'https://example.com/events',
    fetch: async () => new Response(createSSEBody([
      'event: delta\n',
      'id: evt_1\n',
      'data: {"text":"Qore"}\n\n'
    ]), {
      status: 200,
      headers: {
        'content-type': 'text/event-stream'
      }
    }),
    buildRequest: () => ({ method: 'GET' })
  });

  const seen: Array<SSEEvent<{ text: string }>> = [];

  for await (const event of provider.stream()) {
    seen.push(event);
  }

  assert.deepEqual(seen, [{
    event: 'delta',
    id: 'evt_1',
    retry: null,
    data: { text: 'Qore' }
  }]);
});

test('createSSEAdapter surfaces SSE error events through the adapter hook', async () => {
  const provider = createSSEAdapter<Record<string, unknown>, unknown, { type?: string; message?: string }>({
    name: 'Generic Errors',
    url: 'https://example.com/errors',
    fetch: async () => new Response(createSSEBody([
      'event: error\n',
      'data: {"type":"error","message":"boom"}\n\n'
    ]), {
      status: 200,
      headers: {
        'content-type': 'text/event-stream'
      }
    }),
    buildRequest: () => ({ method: 'GET' }),
    getError: (event) => event.data?.message ?? 'unknown'
  });

  const iterator = provider.streamText()[Symbol.asyncIterator]();

  await assert.rejects(() => iterator.next(), /boom/);
});
