import { normalizeError } from './utils.js';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-5';

// Read API keys from Node-like runtimes without assuming process exists everywhere.
function readEnv(name) {
  return typeof process !== 'undefined' && process?.env
    ? process.env[name]
    : undefined;
}

// Treat plain chat text as one user message so callers can start from a single string.
function normalizeChatInput(input) {
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

// Read one JSON or text error body so provider failures surface clearly.
async function readErrorBody(response) {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      const body = await response.json();
      return body?.error?.message ?? body?.message ?? JSON.stringify(body);
    } catch {
      return `${response.status} ${response.statusText}`.trim();
    }
  }

  try {
    const text = await response.text();
    return text || `${response.status} ${response.statusText}`.trim();
  } catch {
    return `${response.status} ${response.statusText}`.trim();
  }
}

// Parse server-sent events without pulling in any runtime dependency.
async function* readSSE(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventName = 'message';
  let eventId = null;
  let retry = null;
  let data = [];

  const flushEvent = () => {
    if (data.length === 0) {
      eventName = 'message';
      eventId = null;
      retry = null;
      return null;
    }

    const nextEvent = {
      event: eventName,
      id: eventId,
      retry,
      data: data.join('\n')
    };

    eventName = 'message';
    eventId = null;
    retry = null;
    data = [];

    return nextEvent;
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line) {
        const nextEvent = flushEvent();

        if (nextEvent) {
          yield nextEvent;
        }

        continue;
      }

      if (line.startsWith(':')) {
        continue;
      }

      const separator = line.indexOf(':');
      const field = separator === -1 ? line : line.slice(0, separator);
      const rawValue = separator === -1 ? '' : line.slice(separator + 1).replace(/^ /, '');

      switch (field) {
        case 'event':
          eventName = rawValue || 'message';
          break;
        case 'data':
          data.push(rawValue);
          break;
        case 'id':
          eventId = rawValue;
          break;
        case 'retry': {
          const parsedRetry = Number.parseInt(rawValue, 10);

          retry = Number.isNaN(parsedRetry) ? null : parsedRetry;
          break;
        }
        default:
          break;
      }
    }

    if (done) {
      break;
    }
  }

  const finalEvent = flushEvent();

  if (finalEvent) {
    yield finalEvent;
  }
}

// Merge headers while allowing per-request overrides.
function mergeHeaders(baseHeaders = {}, nextHeaders = {}) {
  return {
    ...baseHeaders,
    ...nextHeaders
  };
}

// Keep provider setup explicit because real API keys should stay off the client.
export function createOpenAI(options = {}) {
  const {
    apiKey,
    baseURL = DEFAULT_BASE_URL,
    model = DEFAULT_MODEL,
    headers: defaultHeaders = {},
    fetch: fetchImpl = globalThis.fetch
  } = options;

  if (typeof fetchImpl !== 'function') {
    throw new Error('Qore OpenAI adapter requires fetch in the current runtime');
  }

  const resolvedApiKey = apiKey ?? readEnv('OPENAI_API_KEY');

  if (!resolvedApiKey) {
    throw new Error('Qore OpenAI adapter requires an API key. Pass apiKey or set OPENAI_API_KEY.');
  }

  async function* streamEvents(request, requestOptions = {}) {
    const { signal, headers = {}, ...overrides } = requestOptions;
    const response = await fetchImpl(`${baseURL}/responses`, {
      method: 'POST',
      signal,
      headers: mergeHeaders({
        Authorization: `Bearer ${resolvedApiKey}`,
        'Content-Type': 'application/json'
      }, mergeHeaders(defaultHeaders, headers)),
      body: JSON.stringify({
        model,
        stream: true,
        ...request,
        ...overrides
      })
    });

    if (!response.ok) {
      throw new Error(await readErrorBody(response));
    }

    if (!response.body) {
      throw new Error('OpenAI streaming response did not include a readable body');
    }

    for await (const chunk of readSSE(response.body)) {
      if (!chunk.data || chunk.data === '[DONE]') {
        continue;
      }

      let event;

      try {
        event = JSON.parse(chunk.data);
      } catch (error) {
        throw normalizeError(error);
      }

      if (event?.type === 'error') {
        throw new Error(event.error?.message ?? 'OpenAI streaming error');
      }

      yield event;
    }
  }

  async function* streamText(input, requestOptions = {}) {
    const request = input && typeof input === 'object' && 'input' in input
      ? input
      : { input };

    for await (const event of streamEvents(request, requestOptions)) {
      if (event.type === 'response.output_text.delta' && typeof event.delta === 'string') {
        yield event.delta;
      }
    }
  }

  return {
    // Stream typed semantic events from the Responses API.
    responses: {
      stream: streamEvents
    },

    // Stream only text deltas for the common chat-response case.
    streamText(input, requestOptions = {}) {
      return streamText(input, requestOptions);
    },

    // Match the Qore narrative directly: stream(openai.chat(prompt)).
    chat(input, requestOptions = {}) {
      const {
        signal,
        headers,
        ...request
      } = requestOptions;

      if (!('input' in request)) {
        request.input = normalizeChatInput(input);
      }

      return streamText(request, { signal, headers });
    }
  };
}
