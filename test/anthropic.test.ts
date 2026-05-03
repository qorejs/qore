// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';

import { createAnthropic } from '../src/anthropic.js';

const encoder = new TextEncoder();

// Turn event payloads into a tiny text/event-stream body for adapter tests.
function createSSEBody(events) {
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
  const calls = [];
  const anthropic = createAnthropic({
    apiKey: 'test-key',
    fetch: async (url, init) => {
      calls.push({
        url,
        method: init.method,
        headers: init.headers,
        body: JSON.parse(init.body)
      });

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

  const chunks = [];

  for await (const chunk of anthropic.chat('Why stream should be signal?', {
    system: 'Keep it short.',
    max_tokens: 256
  })) {
    chunks.push(chunk);
  }

  assert.deepEqual(chunks, ['Hello', ' Claude']);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.anthropic.com/v1/messages');
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].headers['x-api-key'], 'test-key');
  assert.equal(calls[0].headers['anthropic-version'], '2023-06-01');
  assert.equal(calls[0].body.model, 'claude-sonnet-4-20250514');
  assert.equal(calls[0].body.stream, true);
  assert.equal(calls[0].body.max_tokens, 256);
  assert.equal(calls[0].body.system, 'Keep it short.');
  assert.deepEqual(calls[0].body.messages, [{ role: 'user', content: 'Why stream should be signal?' }]);
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

  const seen = [];

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
