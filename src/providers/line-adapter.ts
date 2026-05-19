import { normalizeError } from '../shared/utils.js';
import { mergeHeaders, readErrorBody } from './sse-env.js';
import { getLineErrorMessage, isLineError, parseLineData, readLines } from './line-parser.js';
import type {
  LineAdapter,
  LineAdapterOptions,
  LineEvent,
  LineRequestConfig,
  ProviderRequestOptions
} from './types.js';

function isRequestConfig(value: unknown): value is LineRequestConfig {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

// Expose a generic line-stream adapter so Qore can integrate with NDJSON-style endpoints.
export function createLineAdapter<TRequest = Record<string, unknown>, TChatInput = unknown, TData = unknown>(
  options: LineAdapterOptions<TRequest, TChatInput, TData> = {}
): LineAdapter<TRequest, TChatInput, TData> {
  const {
    name = 'LineStream',
    url: defaultURL,
    method: defaultMethod = 'POST',
    headers: defaultHeaders = {},
    fetch: fetchImpl = globalThis.fetch,
    buildRequest = null,
    buildChatRequest = null,
    parse = parseLineData,
    isError = isLineError,
    getError = getLineErrorMessage,
    lineToText = (event) => typeof event.data === 'string' ? event.data : undefined
  } = options;

  if (typeof fetchImpl !== 'function') {
    throw new Error(`Qore ${name} adapter requires fetch in the current runtime`);
  }

  async function* stream(
    request: TRequest = {} as TRequest,
    requestOptions: ProviderRequestOptions = {}
  ): AsyncIterable<LineEvent<TData>> {
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
    const signal = requestSignal ?? overrideSignal;

    if (!url) {
      throw new Error(`Qore ${name} adapter requires a request URL`);
    }

    const initConfig = {
      method,
      headers: mergeHeaders(defaultHeaders, mergeHeaders(requestHeaders, overrideHeaders)),
      ...init
    } as RequestInit;

    if (signal) {
      initConfig.signal = signal as AbortSignal;
    }

    const response = await fetchImpl(url, initConfig);

    if (!response.ok) {
      throw new Error(await readErrorBody(response));
    }

    if (!response.body) {
      throw new Error(`${name} streaming response did not include a readable body`);
    }

    for await (const rawEvent of readLines(response.body)) {
      let parsedEvent;

      try {
        parsedEvent = await parse(rawEvent.data, rawEvent) as TData;
      } catch (error) {
        throw normalizeError(error);
      }

      const nextEvent: LineEvent<TData> = {
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
      const nextText = await lineToText(event, request, requestOptions);

      if (typeof nextText === 'string') {
        yield nextText;
      }
    }
  }

  return {
    // Stream parsed line-delimited events from an arbitrary HTTP endpoint.
    stream,

    // Stream only the text payload selected by the adapter's lineToText mapping.
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
