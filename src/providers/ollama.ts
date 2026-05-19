import { createLineAdapter } from './line-adapter.js';
import type {
  OllamaAdapter,
  OllamaChatInput,
  OllamaEvent,
  OllamaMessage,
  OllamaOptions,
  OllamaRequest,
  ProviderRequestOptions
} from './types.js';

const DEFAULT_BASE_URL = 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'llama3.2';

function normalizeChatInput(input: OllamaChatInput): OllamaMessage[] | Record<string, unknown> {
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

export function createOllama(options: OllamaOptions = {}): OllamaAdapter {
  const {
    baseURL = DEFAULT_BASE_URL,
    model = DEFAULT_MODEL,
    headers: defaultHeaders = {},
    fetch: fetchImpl = globalThis.fetch
  } = options;

  const transport = createLineAdapter<OllamaRequest, OllamaChatInput, OllamaEvent>({
    name: 'Ollama',
    url: `${baseURL}/api/chat`,
    headers: {
      'Content-Type': 'application/json',
      ...defaultHeaders
    },
    fetch: fetchImpl,
    buildRequest(request, requestOptions: ProviderRequestOptions = {}) {
      const { signal, headers = {}, ...overrides } = requestOptions;
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
    parse: (line) => JSON.parse(line) as OllamaEvent,
    lineToText: (event) => {
      return typeof event.data?.message?.content === 'string'
        ? event.data.message.content
        : undefined;
    }
  });

  async function* streamEvents(
    request: OllamaRequest,
    requestOptions: ProviderRequestOptions = {}
  ): AsyncIterable<OllamaEvent> {
    for await (const event of transport.stream(request, requestOptions)) {
      yield event.data;
    }
  }

  async function* streamText(
    input: string | OllamaRequest,
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
    stream(request: OllamaRequest, requestOptions: ProviderRequestOptions = {}) {
      return streamEvents(request, requestOptions);
    },

    streamText(input: string | OllamaRequest, requestOptions: ProviderRequestOptions = {}) {
      return streamText(input, requestOptions);
    },

    chat(input: OllamaChatInput, requestOptions: ProviderRequestOptions = {}) {
      const {
        signal,
        headers,
        ...rest
      } = requestOptions;
      const request = { ...rest } as OllamaRequest;

      if (!('messages' in request)) {
        request.messages = normalizeChatInput(input);
      }

      return streamText(request, {
        ...(signal ? { signal } : {}),
        ...(headers ? { headers } : {})
      });
    }
  };
}
