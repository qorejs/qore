import assert from 'node:assert/strict';

import {
  computed,
  createOpenRouter,
  createSSEAdapter,
  response,
  signal,
  stream
} from '@qorejs/qore';

const encoder = new TextEncoder();

function createSSEBody(events) {
  return new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`event: ${event.event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event.data)}\n\n`));
      }

      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    }
  });
}

const count = signal(2);
const doubled = computed(() => count() * 2);
assert.equal(doubled(), 4);

const answer = stream(async ({ push }) => {
  await push('Qore');
  await push(' rocks');
});

await answer.ready;

assert.equal(answer(), 'Qore rocks');
assert.equal(answer.status(), 'completed');
assert.deepEqual(answer.chunks(), ['Qore', ' rocks']);

const transcript = response.list();
await transcript.consume(answer);
assert.deepEqual(transcript.value(), ['Qore', ' rocks']);

const provider = createSSEAdapter({
  name: 'Runtime Smoke',
  url: 'https://example.com/stream',
  fetch: async () => new Response(createSSEBody([
    { event: 'token', data: { type: 'token', text: 'hello' } },
    { event: 'token', data: { type: 'token', text: ' world' } }
  ]), {
    status: 200,
    headers: {
      'content-type': 'text/event-stream'
    }
  }),
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
  eventToText(event) {
    return event.data?.type === 'token' ? event.data.text : undefined;
  }
});

const chunks = [];

for await (const chunk of provider.chat('stream = signal')) {
  chunks.push(chunk);
}

assert.deepEqual(chunks, ['hello', ' world']);

const openrouter = createOpenRouter({
  apiKey: 'test-key',
  fetch: async () => new Response(createSSEBody([
    { event: 'message', data: { choices: [{ delta: { role: 'assistant' } }] } },
    { event: 'message', data: { choices: [{ delta: { content: 'router' } }] } },
    { event: 'message', data: { choices: [{ delta: { content: ' ready' } }] } }
  ]), {
    status: 200,
    headers: {
      'content-type': 'text/event-stream'
    }
  })
});

const openrouterChunks = [];

for await (const chunk of openrouter.chat('stream = signal')) {
  openrouterChunks.push(chunk);
}

assert.deepEqual(openrouterChunks, ['router', ' ready']);

process.stdout.write('package-runtime-ok\n');
