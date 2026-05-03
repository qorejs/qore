// @ts-nocheck
import { normalizeError } from '../shared/utils.js';

// Read environment variables without assuming a Node-only runtime.
export function readEnv(name) {
  return typeof process !== 'undefined' && process?.env
    ? process.env[name]
    : undefined;
}

// Read one JSON or text error body so adapter failures surface clearly.
export async function readErrorBody(response) {
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

// Merge headers while allowing per-request overrides.
export function mergeHeaders(baseHeaders = {}, nextHeaders = {}) {
  return {
    ...baseHeaders,
    ...nextHeaders
  };
}

// Parse server-sent events without adding any transport dependency.
export async function* readSSE(body) {
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

// Default to JSON payloads when possible, otherwise preserve the raw text event body.
function parseEventData(data) {
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

// Surface provider-side SSE error objects through one shared fallback.
function isErrorEvent(event) {
  return Boolean(event.data && typeof event.data === 'object' && event.data.type === 'error');
}

// Pull a human-readable message from common SSE error shapes.
function getErrorMessage(event, name) {
  if (event.data && typeof event.data === 'object') {
    return event.data.error?.message ?? event.data.message ?? `${name} streaming error`;
  }

  return `${name} streaming error`;
}

// Expose a generic SSE adapter so Qore can integrate with any token-streaming endpoint.
export function createSSEAdapter(options = {}) {
  const {
    name = 'SSE',
    url: defaultURL,
    method: defaultMethod = 'POST',
    headers: defaultHeaders = {},
    fetch: fetchImpl = globalThis.fetch,
    buildRequest = null,
    buildChatRequest = null,
    parse = parseEventData,
    isError = isErrorEvent,
    getError = getErrorMessage,
    eventToText = (event) => typeof event.data === 'string' ? event.data : undefined
  } = options;

  if (typeof fetchImpl !== 'function') {
    throw new Error(`Qore ${name} adapter requires fetch in the current runtime`);
  }

  async function* stream(request = {}, requestOptions = {}) {
    const builtRequest = buildRequest
      ? await buildRequest(request, requestOptions)
      : request;

    const requestConfig = builtRequest && typeof builtRequest === 'object' && !Array.isArray(builtRequest)
      ? builtRequest
      : { body: builtRequest };
    const {
      url = defaultURL,
      method = defaultMethod,
      headers: requestHeaders = {},
      signal: requestSignal,
      ...init
    } = requestConfig;
    const {
      signal: overrideSignal,
      headers: overrideHeaders = {}
    } = requestOptions;

    if (!url) {
      throw new Error(`Qore ${name} adapter requires a request URL`);
    }

    const response = await fetchImpl(url, {
      method,
      signal: requestSignal ?? overrideSignal,
      headers: mergeHeaders(defaultHeaders, mergeHeaders(requestHeaders, overrideHeaders)),
      ...init
    });

    if (!response.ok) {
      throw new Error(await readErrorBody(response));
    }

    if (!response.body) {
      throw new Error(`${name} streaming response did not include a readable body`);
    }

    for await (const rawEvent of readSSE(response.body)) {
      if (!rawEvent.data || rawEvent.data === '[DONE]') {
        continue;
      }

      let parsedEvent;

      try {
        parsedEvent = await parse(rawEvent.data, rawEvent);
      } catch (error) {
        throw normalizeError(error);
      }

      const nextEvent = {
        ...rawEvent,
        data: parsedEvent
      };

      if (await isError(nextEvent)) {
        throw new Error(await getError(nextEvent, name));
      }

      yield nextEvent;
    }
  }

  async function* streamText(request = {}, requestOptions = {}) {
    for await (const event of stream(request, requestOptions)) {
      const nextText = await eventToText(event, request, requestOptions);

      if (typeof nextText === 'string') {
        yield nextText;
      }
    }
  }

  return {
    // Stream parsed SSE events from an arbitrary HTTP endpoint.
    stream,

    // Stream only the text payload selected by the adapter's eventToText mapping.
    streamText,

    // Offer the same narrative shape as provider SDKs when buildChatRequest is supplied.
    chat(input, requestOptions = {}) {
      if (typeof buildChatRequest !== 'function') {
        throw new Error(`Qore ${name} adapter does not define chat(). Use stream() or streamText() instead.`);
      }

      return streamText(buildChatRequest(input, requestOptions), requestOptions);
    }
  };
}
