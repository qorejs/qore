// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';

import { createSSEAdapter } from '../src/sse.js';

const encoder = new TextEncoder();

// Turn event payloads into a tiny text/event-stream body for adapter tests.
function createSSEBody(chunks) {
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
  const calls = [];
  const provider = createSSEAdapter({
    name: 'Generic Chat',
    url: 'https://example.com/stream',
    headers: {
      Authorization: 'Bearer generic-key'
    },
    fetch: async (url, init) => {
      calls.push({
        url,
        method: init.method,
        headers: init.headers,
        body: JSON.parse(init.body)
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

  const chunks = [];

  for await (const chunk of provider.chat('hello world')) {
    chunks.push(chunk);
  }

  assert.deepEqual(chunks, ['Hello', ' SSE']);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://example.com/stream');
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].headers.Authorization, 'Bearer generic-key');
  assert.deepEqual(calls[0].body, { prompt: 'hello world' });
});

test('createSSEAdapter stream preserves raw SSE metadata alongside parsed data', async () => {
  const provider = createSSEAdapter({
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

  const seen = [];

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
  const provider = createSSEAdapter({
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
