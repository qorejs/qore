import assert from 'node:assert/strict';

import {
  assertCanUseDOM,
  canUseDOM,
  computed,
  createApp,
  createAnthropic,
  createRoot,
  createResponse,
  createDeepSeek,
  createLineAdapter,
  createOpenAI,
  createOllama,
  createOpenRouter,
  createSSEAdapter,
  dynamic,
  fragment,
  h,
  list,
  mount,
  onCleanup,
  response,
  renderResponse,
  show,
  signal,
  stream,
  text
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
const disposeRoot = createRoot((dispose) => {
  onCleanup(() => {});
  return dispose;
});
disposeRoot();
assert.equal(doubled(), 4);
assert.equal(canUseDOM(), false);
assert.throws(() => assertCanUseDOM('runtime smoke'), /runtime smoke requires a browser-like environment/);
assert.throws(() => h('div', {}, 'hello'), /h\(\) requires a browser-like environment/);
assert.throws(() => text('hello'), /text\(\) requires a browser-like environment/);
assert.throws(() => fragment('hello'), /fragment\(\) requires a browser-like environment/);
assert.throws(() => dynamic(() => 'hello'), /dynamic\(\) requires a browser-like environment/);
assert.throws(() => show(() => true, () => 'hello'), /dynamic\(\) requires a browser-like environment/);
assert.throws(() => list(() => ['a'], (item) => item), /dynamic\(\) requires a browser-like environment/);
assert.throws(() => renderResponse(createResponse({
  seed: '',
  reduce(value, chunk) {
    return value + chunk;
  }
})), /dynamic\(\) requires a browser-like environment/);
assert.throws(() => mount({}, 'hello'), /mount\(\) requires a browser-like environment/);
assert.throws(
  () => createApp(() => h('div', {}, 'hello')).mount('#app'),
  /createApp\(\.\.\.\)\.mount\(\.\.\.\) requires a browser-like environment/
);

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

const anthropic = createAnthropic({
  apiKey: 'test-key',
  fetch: async () => new Response(createSSEBody([
    { event: 'message_start', data: { type: 'message_start', message: { id: 'msg_1' } } },
    { event: 'content_block_delta', data: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'anthropic' } } },
    { event: 'content_block_delta', data: { type: 'content_block_delta', delta: { type: 'text_delta', text: ' stream' } } },
    { event: 'message_stop', data: { type: 'message_stop' } }
  ]), {
    status: 200,
    headers: {
      'content-type': 'text/event-stream'
    }
  })
});

const anthropicChunks = [];

for await (const chunk of anthropic.chat('stream = signal')) {
  anthropicChunks.push(chunk);
}

assert.deepEqual(anthropicChunks, ['anthropic', ' stream']);

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

const openai = createOpenAI({
  apiKey: 'test-key',
  fetch: async () => new Response(createSSEBody([
    { event: 'message', data: { type: 'response.created', response: { id: 'resp_1' } } },
    { event: 'message', data: { type: 'response.output_text.delta', delta: 'open' } },
    { event: 'message', data: { type: 'response.output_text.delta', delta: ' ai' } },
    { event: 'message', data: { type: 'response.completed', response: { id: 'resp_1' } } }
  ]), {
    status: 200,
    headers: {
      'content-type': 'text/event-stream'
    }
  })
});

const openaiChunks = [];

for await (const chunk of openai.chat('stream = signal')) {
  openaiChunks.push(chunk);
}

assert.deepEqual(openaiChunks, ['open', ' ai']);

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
