import assert from 'node:assert/strict';

import {
  assertCanUseDOM,
  canUseDOM,
  computed,
  createApp,
  createAnthropic,
  createRoot,
  createResponse,
  createSSEResponse,
  createDeepSeek,
  createLineAdapter,
  createOpenAI,
  createOllama,
  createOpenRouter,
  createSSEAdapter,
  collectProviderMetadata,
  dynamic,
  extractAnthropicMetadata,
  extractOllamaMetadata,
  extractOpenAIMetadata,
  extractOpenRouterMetadata,
  fragment,
  h,
  list,
  mount,
  mergeProviderMetadata,
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

const serverResponse = createSSEResponse(['server', ' stream']);
assert.equal(serverResponse.headers.get('content-type'), 'text/event-stream; charset=utf-8');
const serverResponseBody = new TextDecoder().decode(await serverResponse.arrayBuffer());
assert.match(serverResponseBody, /data: server\n\n/);
assert.match(serverResponseBody, /data:  stream\n\n/);

const mergedMetadata = mergeProviderMetadata({
  provider: 'OpenAI',
  responseId: 'resp_1',
  usage: {
    inputTokens: 2
  }
}, {
  usage: {
    outputTokens: 3
  }
});
assert.deepEqual(mergedMetadata, {
  provider: 'OpenAI',
  responseId: 'resp_1',
  usage: {
    inputTokens: 2,
    outputTokens: 3,
    totalTokens: 5
  }
});

const normalizedMetadata = await collectProviderMetadata('OpenAI', [
  { type: 'response.created', response: { id: 'resp_meta', model: 'gpt-5' } },
  { type: 'response.completed', response: { id: 'resp_meta', usage: { input_tokens: 3, output_tokens: 4 } } }
], extractOpenAIMetadata);
assert.deepEqual(normalizedMetadata, {
  provider: 'OpenAI',
  responseId: 'resp_meta',
  model: 'gpt-5',
  usage: {
    inputTokens: 3,
    outputTokens: 4,
    totalTokens: 7
  }
});
assert.deepEqual(extractOpenRouterMetadata({
  id: 'chat_meta',
  choices: [{ finish_reason: 'stop', delta: {} }]
}), {
  responseId: 'chat_meta',
  finishReason: 'stop'
});
assert.deepEqual(extractAnthropicMetadata({
  type: 'message_delta',
  delta: { stop_reason: 'end_turn' }
}), {
  finishReason: 'end_turn',
  stopReason: 'end_turn'
});
assert.deepEqual(extractOllamaMetadata({
  model: 'llama3.2',
  done_reason: 'stop',
  prompt_eval_count: 5,
  eval_count: 6
}), {
  model: 'llama3.2',
  finishReason: 'stop',
  stopReason: 'stop',
  usage: {
    inputTokens: 5,
    outputTokens: 6,
    totalTokens: 11
  }
});

const answer = stream(async ({ push }) => {
  await push('Qore');
  await push(' rocks');
});
const merged = stream.merge([['Qore'], [' merge']]);
const concatenated = stream.concat([['Qore'], [' concat']]);
const piped = stream.pipe(['Qore'], [
  (value) => [value.toUpperCase()],
  (value) => [` ${value.length}`]
]);
const raced = stream.race([
  (async function* slow() {
    await new Promise((resolve) => setTimeout(resolve, 10));
    yield 'slow';
  })(),
  ['fast', ' lane']
]);
const retried = stream.retryable((attempt) => async ({ push }) => {
  if (attempt < 1) {
    throw new Error('retry once');
  }

  await push('retry ok');
}, { maxRetries: 1, backoff: 0 });
const switched = stream.switchMap([
  { label: 'old', delay: 10 },
  { label: 'new', delay: 1 }
], async (entry) => (async function* switchedChunks() {
  yield `${entry.label}:1`;
  await new Promise((resolve) => setTimeout(resolve, entry.delay));
  yield `${entry.label}:2`;
})());
const events = stream.events([
  { type: 'status', value: 'running' },
  { type: 'text', text: 'event ' },
  { type: 'tool_call', name: 'search' },
  { type: 'text', text: 'stream' },
  { type: 'status', value: 'done' }
]);
const eventText = events.select('text', {
  seed: '',
  reduce: (currentValue, event) => currentValue + event.text
});
const toolCalls = events.select('tool_call');

await Promise.all([answer.ready, merged.ready, raced.ready, retried.ready, switched.ready, events.ready, eventText.ready, toolCalls.ready]);

assert.equal(answer(), 'Qore rocks');
assert.equal(answer.status(), 'completed');
assert.deepEqual(answer.chunks(), ['Qore', ' rocks']);
assert.equal(merged(), 'Qore merge');
assert.equal(concatenated(), 'Qore concat');
assert.equal(piped(), 'QoreQORE 4');
assert.equal(raced(), 'fast lane');
assert.equal(retried(), 'retry ok');
assert.deepEqual(switched.chunks(), ['old:1', 'new:1', 'new:2']);
assert.equal(eventText(), 'event stream');
assert.deepEqual(toolCalls(), [{ type: 'tool_call', name: 'search' }]);

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
let retryAttempts = 0;
const retryingProvider = createSSEAdapter({
  name: 'Runtime Retry Smoke',
  url: 'https://example.com/retry-stream',
  fetch: async () => {
    retryAttempts += 1;

    if (retryAttempts === 1) {
      return new Response(JSON.stringify({
        error: {
          message: 'retry me'
        }
      }), {
        status: 503,
        headers: {
          'content-type': 'application/json'
        }
      });
    }

    return new Response(createSSEBody([
      { event: 'token', data: { type: 'token', text: 'retry' } },
      { event: 'token', data: { type: 'token', text: ' ok' } }
    ]), {
      status: 200,
      headers: {
        'content-type': 'text/event-stream'
      }
    });
  },
  buildChatRequest(input) {
    return {
      prompt: input
    };
  },
  eventToText(event) {
    return event.data?.type === 'token' ? event.data.text : undefined;
  },
  retry: {
    maxAttempts: 2,
    backoff: 0
  }
});

const chunks = [];

for await (const chunk of provider.chat('stream = signal')) {
  chunks.push(chunk);
}

assert.deepEqual(chunks, ['hello', ' world']);

const retryChunks = [];

for await (const chunk of retryingProvider.chat('stream = signal')) {
  retryChunks.push(chunk);
}

assert.deepEqual(retryChunks, ['retry', ' ok']);
assert.equal(retryAttempts, 2);

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
