import { createSSEAdapter, readEnv } from './sse.js';
import type {
  AnthropicAdapter,
  AnthropicChatInput,
  AnthropicEvent,
  AnthropicMessage,
  AnthropicOptions,
  AnthropicRequest,
  ProviderRequestOptions
} from './types.js';

const DEFAULT_BASE_URL = 'https://api.anthropic.com/v1';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_VERSION = '2023-06-01';
const DEFAULT_MAX_TOKENS = 1024;

// Normalize single-string prompts into Anthropic's Messages API shape.
function normalizeMessages(input: AnthropicChatInput): AnthropicMessage[] | Record<string, unknown> {
  if (typeof input === 'string') {
    return [{ role: 'user', content: input }];
  }

  if (Array.isArray(input)) {
    return input;
  }

  if (input && typeof input === 'object' && 'role' in input) {
    return [input];
  }

  return input;
}

// Keep provider setup explicit because real API keys should stay off the client.
export function createAnthropic(options: AnthropicOptions = {}): AnthropicAdapter {
  const {
    apiKey,
    baseURL = DEFAULT_BASE_URL,
    model = DEFAULT_MODEL,
    version = DEFAULT_VERSION,
    maxTokens = DEFAULT_MAX_TOKENS,
    headers: defaultHeaders = {},
    fetch: fetchImpl = globalThis.fetch
  } = options;
  const resolvedApiKey = apiKey ?? readEnv('ANTHROPIC_API_KEY');

  if (!resolvedApiKey) {
    throw new Error('Qore Anthropic adapter requires an API key. Pass apiKey or set ANTHROPIC_API_KEY.');
  }

  const transport = createSSEAdapter<AnthropicRequest, AnthropicChatInput, AnthropicEvent>({
    name: 'Anthropic',
    url: `${baseURL}/messages`,
    headers: {
      'content-type': 'application/json',
      'anthropic-version': version,
      'x-api-key': resolvedApiKey,
      ...defaultHeaders
    },
    fetch: fetchImpl,
    buildRequest(request, requestOptions: ProviderRequestOptions = {}) {
      const { signal, headers = {}, ...overrides } = requestOptions;

      return {
        method: 'POST',
        signal,
        headers,
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          stream: true,
          ...request,
          ...overrides
        })
      };
    },
    parse: (data) => JSON.parse(data) as AnthropicEvent,
    isError: (event) => event.data?.type === 'error',
    getError: (event) => {
      const errorEvent = event.data as { error?: { message?: string } };
      return errorEvent.error?.message ?? 'Anthropic streaming error';
    },
    eventToText: (event) => (
      event.data?.type === 'content_block_delta'
      && typeof (event.data as { delta?: { type?: unknown; text?: unknown } }).delta?.type === 'string'
      && (event.data as { delta?: { type?: string; text?: unknown } }).delta?.type === 'text_delta'
      && typeof (event.data as { delta?: { text?: unknown } }).delta?.text === 'string'
    )
      ? (event.data as unknown as { delta: { text: string } }).delta.text
      : undefined
  });

  async function* streamEvents(
    request: AnthropicRequest,
    requestOptions: ProviderRequestOptions = {}
  ): AsyncIterable<AnthropicEvent> {
    for await (const event of transport.stream(request, requestOptions)) {
      yield event.data;
    }
  }

  async function* streamText(
    messages: string | AnthropicRequest,
    requestOptions: ProviderRequestOptions = {}
  ): AsyncIterable<string> {
    const request = messages && typeof messages === 'object' && 'messages' in messages
      ? messages
      : { messages };

    for await (const chunk of transport.streamText(request, requestOptions)) {
      yield chunk;
    }
  }

  return {
    // Stream typed semantic events from the Messages API.
    messages: {
      stream: streamEvents
    },

    // Stream only text delta chunks from assistant content blocks.
    streamText(messages: string | AnthropicRequest, requestOptions: ProviderRequestOptions = {}) {
      return streamText(messages, requestOptions);
    },

    // Match the Qore narrative directly: stream(anthropic.chat(prompt)).
    chat(input: AnthropicChatInput, requestOptions: ProviderRequestOptions = {}) {
      const {
        signal,
        headers,
        ...rest
      } = requestOptions;
      const request = { ...rest } as AnthropicRequest;

      if (!('messages' in request)) {
        request.messages = normalizeMessages(input);
      }

      return streamText(request, { signal, headers });
    }
  };
}
