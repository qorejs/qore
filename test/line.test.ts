import test from 'node:test';
import assert from 'node:assert/strict';

import { createLineAdapter } from '../src/index.js';

const encoder = new TextEncoder();

function createLineBody(lines: unknown[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
      }

      controller.close();
    }
  });
}

test('createLineAdapter can map a custom chat endpoint into stream(provider.chat(...))', async () => {
  const calls: Array<{
    url: string | URL | Request;
    body: Record<string, unknown>;
    method?: string;
    headers?: HeadersInit;
  }> = [];
  const provider = createLineAdapter<{ prompt: string }, string, { type?: string; text?: string }>({
    name: 'Line Demo',
    url: 'https://example.com/line-stream',
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
        { type: 'token', text: 'flow' },
        { type: 'token', text: ' state' },
        { type: 'done' }
      ]), {
        status: 200,
        headers: {
          'content-type': 'application/x-ndjson'
        }
      });
    },
    buildRequest(request) {
      return {
        method: 'POST',
        body: JSON.stringify(request)
      };
    },
    buildChatRequest(prompt) {
      return { prompt };
    },
    lineToText(event) {
      return event.data.type === 'token' ? event.data.text : undefined;
    }
  });

  const chunks: string[] = [];

  for await (const chunk of provider.chat('stream = signal')) {
    chunks.push(chunk);
  }

  assert.deepEqual(chunks, ['flow', ' state']);
  assert.equal(calls.length, 1);
  const [call] = calls;
  assert.ok(call);
  assert.equal(call.url, 'https://example.com/line-stream');
  assert.equal(call.method, 'POST');
  assert.deepEqual(call.body, { prompt: 'stream = signal' });
});

test('createLineAdapter stream preserves raw line metadata alongside parsed data', async () => {
  const provider = createLineAdapter<Record<string, unknown>, unknown, { text: string }>({
    url: 'https://example.com/raw-lines',
    fetch: async () => new Response(createLineBody([
      { text: 'alpha' },
      { text: 'beta' }
    ]), {
      status: 200,
      headers: {
        'content-type': 'application/x-ndjson'
      }
    })
  });

  const seen: Array<{ line: number; raw: string; text: string }> = [];

  for await (const event of provider.stream()) {
    seen.push({
      line: event.line,
      raw: event.raw,
      text: event.data.text
    });
  }

  assert.deepEqual(seen, [
    { line: 1, raw: '{"text":"alpha"}', text: 'alpha' },
    { line: 2, raw: '{"text":"beta"}', text: 'beta' }
  ]);
});

test('createLineAdapter surfaces line-stream error events through the adapter hook', async () => {
  const provider = createLineAdapter<Record<string, unknown>, unknown, { error?: string }>({
    name: 'Line Errors',
    url: 'https://example.com/error-lines',
    fetch: async () => new Response(createLineBody([
      { error: 'No more tokens for you.' }
    ]), {
      status: 200,
      headers: {
        'content-type': 'application/x-ndjson'
      }
    })
  });

  const iterator = provider.stream()[Symbol.asyncIterator]();

  await assert.rejects(() => iterator.next(), /No more tokens for you/);
});
