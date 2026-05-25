import { normalizeAbortReason, normalizeError, sleep } from '../shared/utils.js';
import { mergeHeaders, readErrorBody } from './sse-env.js';
import { getErrorMessage, isErrorEvent, parseEventData, readSSE } from './sse-parser.js';
import type {
  ProviderRequestOptions,
  SSEAdapter,
  SSEAdapterOptions,
  SSEEvent,
  ProviderRetryOptions,
  SSERequestConfig
} from './types.js';

function isRequestConfig(value: unknown): value is SSERequestConfig {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

type RetryableProviderError = Error & {
  status?: number;
};

type NormalizedRetryOptions = {
  maxAttempts: number;
  backoff: ProviderRetryOptions['backoff'];
  resume: boolean;
  retryOn?: ProviderRetryOptions['retryOn'];
};

function toRetryableProviderError(error: unknown): RetryableProviderError {
  return normalizeError(error) as RetryableProviderError;
}

function withStatus(error: Error, status: number): RetryableProviderError {
  const nextError = error as RetryableProviderError;
  nextError.status = status;
  return nextError;
}

function normalizeRetryOptions(
  options: ProviderRetryOptions | undefined,
  overrides: ProviderRetryOptions | undefined
): NormalizedRetryOptions {
  return {
    maxAttempts: overrides?.maxAttempts ?? options?.maxAttempts ?? 1,
    backoff: overrides?.backoff ?? options?.backoff ?? 'exponential',
    resume: overrides?.resume ?? options?.resume ?? true,
    retryOn: overrides?.retryOn ?? options?.retryOn
  };
}

async function shouldRetry(
  error: RetryableProviderError,
  attempt: number,
  options: NormalizedRetryOptions
): Promise<boolean> {
  if (attempt >= options.maxAttempts) {
    return false;
  }

  if (typeof options.retryOn === 'function') {
    return options.retryOn(error, attempt);
  }

  if (typeof error.status === 'number') {
    return error.status === 408
      || error.status === 409
      || error.status === 425
      || error.status === 429
      || error.status >= 500;
  }

  return true;
}

async function resolveRetryDelay(
  options: NormalizedRetryOptions,
  attempt: number,
  error: RetryableProviderError,
  retryHint: number | null
): Promise<number> {
  if (retryHint !== null && retryHint >= 0) {
    return retryHint;
  }

  const { backoff = 'exponential' } = options;

  if (typeof backoff === 'function') {
    return Math.max(0, await backoff(attempt, error, retryHint));
  }

  if (Array.isArray(backoff)) {
    return Math.max(0, backoff[Math.min(attempt - 1, backoff.length - 1)] ?? 0);
  }

  if (backoff === 'exponential') {
    return 250 * 2 ** (attempt - 1);
  }

  return Math.max(0, backoff);
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
    eventToText = (event) => typeof event.data === 'string' ? event.data : undefined,
    retry: defaultRetry
  } = options;

  if (typeof fetchImpl !== 'function') {
    throw new Error(`Qore ${name} adapter requires fetch in the current runtime`);
  }

  async function* stream(
    request: TRequest = {} as TRequest,
    requestOptions: ProviderRequestOptions = {}
  ): AsyncIterable<SSEEvent<TData>> {
    const { signal: overrideSignal, headers: overrideHeaders = {}, retry: overrideRetry } = requestOptions;
    const retry = normalizeRetryOptions(defaultRetry, overrideRetry);
    let attempt = 0;
    let lastEventId: string | null = null;
    let retryHint: number | null = null;
    let activeSignal = overrideSignal ?? null;

    while (true) {
      attempt += 1;

      try {
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
        const signal = requestSignal ?? overrideSignal;
        activeSignal = signal ?? null;

        if (!url) {
          throw new Error(`Qore ${name} adapter requires a request URL`);
        }

        if (signal?.aborted) {
          throw normalizeAbortReason(signal.reason, `${name} request aborted`);
        }

        const resumeHeaders = retry.resume && lastEventId
          ? { 'Last-Event-ID': lastEventId }
          : {};
        const initConfig = {
          method,
          headers: mergeHeaders(
            defaultHeaders,
            mergeHeaders(requestHeaders, mergeHeaders(overrideHeaders, resumeHeaders))
          ),
          ...init
        } as RequestInit;

        if (signal) {
          initConfig.signal = signal as AbortSignal;
        }

        const response = await fetchImpl(url, initConfig);

        if (!response.ok) {
          throw withStatus(new Error(await readErrorBody(response)), response.status);
        }

        if (!response.body) {
          throw new Error(`${name} streaming response did not include a readable body`);
        }

        for await (const rawEvent of readSSE(response.body, signal)) {
          if (rawEvent.id) {
            lastEventId = rawEvent.id;
          }

          if (rawEvent.retry !== null) {
            retryHint = rawEvent.retry;
          }

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

        return;
      } catch (error) {
        const normalizedError = toRetryableProviderError(error);

        if (activeSignal?.aborted || overrideSignal?.aborted) {
          throw normalizedError;
        }

        if (!await shouldRetry(normalizedError, attempt, retry)) {
          throw normalizedError;
        }

        const delay = await resolveRetryDelay(retry, attempt, normalizedError, retryHint);

        if (delay > 0) {
          await sleep(delay, overrideSignal ?? null);
        }
      }
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
