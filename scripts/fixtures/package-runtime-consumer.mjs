import assert from 'node:assert/strict';

import {
  canUseDOM,
  computed,
  createDeepSeek,
  createLineAdapter,
  createOllama,
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

function createLineBody(events) {
  return new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      }

      controller.close();
    }
  });
}

const count = signal(2);
const doubled = computed(() => count() * 2);
assert.equal(doubled(), 4);
assert.equal(typeof canUseDOM(), 'boolean');

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

const lineProvider = createLineAdapter({
  name: 'Runtime Line Smoke',
  url: 'https://example.com/lines',
  fetch: async () => new Response(createLineBody([
    { type: 'token', text: 'line' },
    { type: 'token', text: ' stream' }
  ]), {
    status: 200,
    headers: {
      'content-type': 'application/x-ndjson'
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
  lineToText(event) {
    return event.data?.type === 'token' ? event.data.text : undefined;
  }
});

const lineChunks = [];

for await (const chunk of lineProvider.chat('stream = signal')) {
  lineChunks.push(chunk);
}

assert.deepEqual(lineChunks, ['line', ' stream']);

const ollama = createOllama({
  fetch: async () => new Response(createLineBody([
    { message: { role: 'assistant', content: 'local' }, done: false },
    { message: { role: 'assistant', content: ' model' }, done: false },
    { done: true, done_reason: 'stop' }
  ]), {
    status: 200,
    headers: {
      'content-type': 'application/x-ndjson'
    }
  })
});

const ollamaChunks = [];

for await (const chunk of ollama.chat('stream = signal')) {
  ollamaChunks.push(chunk);
}

assert.deepEqual(ollamaChunks, ['local', ' model']);

const deepseek = createDeepSeek({
  apiKey: 'test-key',
  fetch: async () => new Response(createSSEBody([
    { event: 'message', data: { choices: [{ delta: { role: 'assistant' } }] } },
    { event: 'message', data: { choices: [{ delta: { content: 'deep' } }] } },
    { event: 'message', data: { choices: [{ delta: { content: 'seek' } }] } }
  ]), {
    status: 200,
    headers: {
      'content-type': 'text/event-stream'
    }
  })
});

const deepseekChunks = [];

for await (const chunk of deepseek.chat('stream = signal')) {
  deepseekChunks.push(chunk);
}

assert.deepEqual(deepseekChunks, ['deep', 'seek']);

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
