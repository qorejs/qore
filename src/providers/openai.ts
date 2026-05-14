import { createSSEAdapter, readEnv } from './sse.js';
import type {
  OpenAIAdapter,
  OpenAIChatInput,
  OpenAIEvent,
  OpenAIMessage,
  OpenAIOptions,
  OpenAIRequest,
  ProviderRequestOptions
} from './types.js';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-5';

// Treat plain chat text as one user message so callers can start from a single string.
function normalizeChatInput(input: OpenAIChatInput): OpenAIMessage[] | Record<string, unknown> {
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
export function createOpenAI(options: OpenAIOptions = {}): OpenAIAdapter {
  const {
    apiKey,
    baseURL = DEFAULT_BASE_URL,
    model = DEFAULT_MODEL,
    headers: defaultHeaders = {},
    fetch: fetchImpl = globalThis.fetch
  } = options;
  const resolvedApiKey = apiKey ?? readEnv('OPENAI_API_KEY');

  if (!resolvedApiKey) {
    throw new Error('Qore OpenAI adapter requires an API key. Pass apiKey or set OPENAI_API_KEY.');
  }

  const transport = createSSEAdapter<OpenAIRequest, OpenAIChatInput, OpenAIEvent>({
    name: 'OpenAI',
    url: `${baseURL}/responses`,
    headers: {
      Authorization: `Bearer ${resolvedApiKey}`,
      'Content-Type': 'application/json',
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
          stream: true,
          ...request,
          ...overrides
        })
      };
    },
    parse: (data) => JSON.parse(data) as OpenAIEvent,
    isError: (event) => event.data?.type === 'error',
    getError: (event) => {
      const errorEvent = event.data as { error?: { message?: string } };
      return errorEvent.error?.message ?? 'OpenAI streaming error';
    },
    eventToText: (event) => event.data?.type === 'response.output_text.delta'
      && typeof (event.data as { delta?: unknown }).delta === 'string'
      ? (event.data as unknown as { delta: string }).delta
      : undefined
  });

  async function* streamEvents(
    request: OpenAIRequest,
    requestOptions: ProviderRequestOptions = {}
  ): AsyncIterable<OpenAIEvent> {
    for await (const event of transport.stream(request, requestOptions)) {
      yield event.data;
    }
  }

  async function* streamText(
    input: string | OpenAIRequest,
    requestOptions: ProviderRequestOptions = {}
  ): AsyncIterable<string> {
    const request = input && typeof input === 'object' && 'input' in input
      ? input
      : { input };

    for await (const chunk of transport.streamText(request, requestOptions)) {
      yield chunk;
    }
  }

  return {
    // Stream typed semantic events from the Responses API.
    responses: {
      stream: streamEvents
    },

    // Stream only text deltas for the common chat-response case.
    streamText(input: string | OpenAIRequest, requestOptions: ProviderRequestOptions = {}) {
      return streamText(input, requestOptions);
    },

    // Match the Qore narrative directly: stream(openai.chat(prompt)).
    chat(input: OpenAIChatInput, requestOptions: ProviderRequestOptions = {}) {
      const {
        signal,
        headers,
        ...rest
      } = requestOptions;
      const request = { ...rest } as OpenAIRequest;

      if (!('input' in request)) {
        request.input = normalizeChatInput(input);
      }

      return streamText(request, { signal, headers });
    }
  };
}
