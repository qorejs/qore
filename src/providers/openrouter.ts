import { createSSEAdapter, readEnv } from './sse.js';
import type {
  OpenRouterAdapter,
  OpenRouterChatInput,
  OpenRouterEvent,
  OpenRouterMessage,
  OpenRouterOptions,
  OpenRouterRequest,
  ProviderRequestOptions
} from './types.js';

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'openai/gpt-4.1-mini';

function normalizeChatInput(input: OpenRouterChatInput): OpenRouterMessage[] | Record<string, unknown> {
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

export function createOpenRouter(options: OpenRouterOptions = {}): OpenRouterAdapter {
  const {
    apiKey,
    baseURL = DEFAULT_BASE_URL,
    model = DEFAULT_MODEL,
    headers: defaultHeaders = {},
    fetch: fetchImpl = globalThis.fetch,
    retry
  } = options;
  const resolvedApiKey = apiKey ?? readEnv('OPENROUTER_API_KEY');

  if (!resolvedApiKey) {
    throw new Error('Qore OpenRouter adapter requires an API key. Pass apiKey or set OPENROUTER_API_KEY.');
  }

  const transport = createSSEAdapter<OpenRouterRequest, OpenRouterChatInput, OpenRouterEvent>({
    name: 'OpenRouter',
    url: `${baseURL}/chat/completions`,
    headers: {
      Authorization: `Bearer ${resolvedApiKey}`,
      'Content-Type': 'application/json',
      ...defaultHeaders
    },
    fetch: fetchImpl,
    ...(retry ? { retry } : {}),
    buildRequest(request, requestOptions: ProviderRequestOptions = {}) {
      const { signal, headers = {}, retry: _retry, ...overrides } = requestOptions;
      const config = {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          stream: true,
          ...request,
          ...overrides
        })
      } as {
        method: 'POST';
        headers: Record<string, string>;
        body: string;
        signal?: ProviderRequestOptions['signal'];
      };

      if (signal) {
        config.signal = signal;
      }

      return config;
    },
    parse: (data) => JSON.parse(data) as OpenRouterEvent,
    eventToText: (event) => {
      const nextChoice = event.data?.choices?.[0];
      return typeof nextChoice?.delta?.content === 'string'
        ? nextChoice.delta.content
        : undefined;
    }
  });

  async function* streamEvents(
    request: OpenRouterRequest,
    requestOptions: ProviderRequestOptions = {}
  ): AsyncIterable<OpenRouterEvent> {
    for await (const event of transport.stream(request, requestOptions)) {
      yield event.data;
    }
  }

  async function* streamText(
    input: string | OpenRouterRequest,
    requestOptions: ProviderRequestOptions = {}
  ): AsyncIterable<string> {
    const request = input && typeof input === 'object' && 'messages' in input
      ? input
      : { messages: input };

    for await (const chunk of transport.streamText(request, requestOptions)) {
      yield chunk;
    }
  }

  return {
    chatCompletions: {
      stream: streamEvents
    },

    streamText(input: string | OpenRouterRequest, requestOptions: ProviderRequestOptions = {}) {
      return streamText(input, requestOptions);
    },

    chat(input: OpenRouterChatInput, requestOptions: ProviderRequestOptions = {}) {
      const {
        signal,
        headers,
        retry,
        ...rest
      } = requestOptions;
      const request = { ...rest } as OpenRouterRequest;

      if (!('messages' in request)) {
        request.messages = normalizeChatInput(input);
      }

      return streamText(request, {
        ...(signal ? { signal } : {}),
        ...(headers ? { headers } : {}),
        ...(retry ? { retry } : {})
      });
    }
  };
}
