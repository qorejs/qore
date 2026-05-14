import { normalizeError } from '../shared/utils.js';
import { mergeHeaders, readErrorBody } from './sse-env.js';
import { getErrorMessage, isErrorEvent, parseEventData, readSSE } from './sse-parser.js';
import type {
  ProviderRequestOptions,
  SSEAdapter,
  SSEAdapterOptions,
  SSEEvent,
  SSERequestConfig
} from './types.js';

function isRequestConfig(value: unknown): value is SSERequestConfig {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

// Expose a generic SSE adapter so Qore can integrate with any token-streaming endpoint.
export function createSSEAdapter<TRequest = Record<string, unknown>, TChatInput = unknown, TData = unknown>(
  options: SSEAdapterOptions<TRequest, TChatInput, TData> = {}
): SSEAdapter<TRequest, TChatInput, TData> {
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

  async function* stream(
    request: TRequest = {} as TRequest,
    requestOptions: ProviderRequestOptions = {}
  ): AsyncIterable<SSEEvent<TData>> {
    const builtRequest = buildRequest
      ? await buildRequest(request, requestOptions)
      : request;

    const requestConfig = isRequestConfig(builtRequest)
      ? builtRequest
      : { body: builtRequest as BodyInit | null };
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
        parsedEvent = await parse(rawEvent.data, rawEvent) as TData;
      } catch (error) {
        throw normalizeError(error);
      }

      const nextEvent: SSEEvent<TData> = {
        ...rawEvent,
        data: parsedEvent
      };

      if (await isError(nextEvent)) {
        throw new Error(await getError(nextEvent, name));
      }

      yield nextEvent;
    }
  }

  async function* streamText(
    request: TRequest = {} as TRequest,
    requestOptions: ProviderRequestOptions = {}
  ): AsyncIterable<string> {
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
    chat(input: TChatInput, requestOptions: ProviderRequestOptions = {}) {
      if (typeof buildChatRequest !== 'function') {
        throw new Error(`Qore ${name} adapter does not define chat(). Use stream() or streamText() instead.`);
      }

      return streamText(buildChatRequest(input, requestOptions), requestOptions);
    }
  };
}
