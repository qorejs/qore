import test from 'node:test';
import assert from 'node:assert/strict';

import { createAnthropic } from '../src/index.js';
import type { AnthropicEvent } from '../src/providers/types.js';

const encoder = new TextEncoder();

// Turn event payloads into a tiny text/event-stream body for adapter tests.
function createSSEBody(events: AnthropicEvent[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`event: ${event.type}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      controller.close();
    }
  });
}

test('createAnthropic chat streams text deltas from the Messages API', async () => {
  const calls: Array<{
    url: string | URL | Request;
    body: Record<string, unknown>;
    method?: string;
    headers?: HeadersInit;
  }> = [];
  const anthropic = createAnthropic({
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
        { type: 'message_start', message: { id: 'msg_1' } },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: ' Claude' } },
        { type: 'message_stop' }
      ]), {
        status: 200,
        headers: {
          'content-type': 'text/event-stream'
        }
      });
    }
  });

  const chunks: string[] = [];

  for await (const chunk of anthropic.chat('Why stream should be signal?', {
    system: 'Keep it short.',
    max_tokens: 256
  })) {
    chunks.push(chunk);
  }

  assert.deepEqual(chunks, ['Hello', ' Claude']);
  assert.equal(calls.length, 1);
  const [call] = calls;
  assert.ok(call);
  assert.equal(call.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(call.method, 'POST');
  const headers = call.headers as Record<string, string>;
  assert.equal(headers['x-api-key'], 'test-key');
  assert.equal(headers['anthropic-version'], '2023-06-01');
  assert.equal(call.body.model, 'claude-sonnet-4-20250514');
  assert.equal(call.body.stream, true);
  assert.equal(call.body.max_tokens, 256);
  assert.equal(call.body.system, 'Keep it short.');
  assert.deepEqual(call.body.messages, [{ role: 'user', content: 'Why stream should be signal?' }]);
});

test('createAnthropic messages.stream yields typed events', async () => {
  const anthropic = createAnthropic({
    apiKey: 'test-key',
    fetch: async () => new Response(createSSEBody([
      { type: 'message_start', message: { id: 'msg_2' } },
      { type: 'content_block_delta', delta: { type: 'text_delta', text: 'A' } },
      { type: 'message_stop' }
    ]), {
      status: 200,
      headers: {
        'content-type': 'text/event-stream'
      }
    })
  });

  const seen: string[] = [];

  for await (const event of anthropic.messages.stream({ messages: [{ role: 'user', content: 'hello' }] })) {
    seen.push(event.type);
  }

  assert.deepEqual(seen, ['message_start', 'content_block_delta', 'message_stop']);
});

test('createAnthropic surfaces provider HTTP errors clearly', async () => {
  const anthropic = createAnthropic({
    apiKey: 'bad-key',
    fetch: async () => new Response(JSON.stringify({
      error: {
        message: 'Invalid x-api-key'
      }
    }), {
      status: 401,
      headers: {
        'content-type': 'application/json'
      }
    })
  });

  const iterator = anthropic.chat('hello')[Symbol.asyncIterator]();

  await assert.rejects(() => iterator.next(), /Invalid x-api-key/);
});
