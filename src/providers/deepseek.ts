import { createSSEAdapter, readEnv } from './sse.js';
import type {
  DeepSeekAdapter,
  DeepSeekChatInput,
  DeepSeekEvent,
  DeepSeekMessage,
  DeepSeekOptions,
  DeepSeekRequest,
  ProviderRequestOptions
} from './types.js';

const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-chat';

function normalizeChatInput(input: DeepSeekChatInput): DeepSeekMessage[] | Record<string, unknown> {
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

export function createDeepSeek(options: DeepSeekOptions = {}): DeepSeekAdapter {
  const {
    apiKey,
    baseURL = DEFAULT_BASE_URL,
    model = DEFAULT_MODEL,
    headers: defaultHeaders = {},
    fetch: fetchImpl = globalThis.fetch,
    retry
  } = options;
  const resolvedApiKey = apiKey ?? readEnv('DEEPSEEK_API_KEY');

  if (!resolvedApiKey) {
    throw new Error('Qore DeepSeek adapter requires an API key. Pass apiKey or set DEEPSEEK_API_KEY.');
  }

  const transport = createSSEAdapter<DeepSeekRequest, DeepSeekChatInput, DeepSeekEvent>({
    name: 'DeepSeek',
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
    parse: (data) => JSON.parse(data) as DeepSeekEvent,
    eventToText: (event) => {
      const nextChoice = event.data?.choices?.[0];
      return typeof nextChoice?.delta?.content === 'string'
        ? nextChoice.delta.content
        : undefined;
    }
  });

  async function* streamEvents(
    request: DeepSeekRequest,
    requestOptions: ProviderRequestOptions = {}
  ): AsyncIterable<DeepSeekEvent> {
    for await (const event of transport.stream(request, requestOptions)) {
      yield event.data;
    }
  }

  async function* streamText(
    input: string | DeepSeekRequest,
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

    streamText(input: string | DeepSeekRequest, requestOptions: ProviderRequestOptions = {}) {
      return streamText(input, requestOptions);
    },

    chat(input: DeepSeekChatInput, requestOptions: ProviderRequestOptions = {}) {
      const {
        signal,
        headers,
        retry,
        ...rest
      } = requestOptions;
      const request = { ...rest } as DeepSeekRequest;

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
