import type { GlobalAbortSignal, MaybePromise } from '../core/response.js';

export type ProviderHeaders = Record<string, string>;

export type ProviderRetryBackoff =
  | number
  | number[]
  | 'exponential'
  | ((attempt: number, error: unknown, retryHint: number | null) => MaybePromise<number>);

export interface ProviderRetryOptions {
  maxAttempts?: number;
  backoff?: ProviderRetryBackoff;
  resume?: boolean;
  retryOn?: (error: unknown, attempt: number) => MaybePromise<boolean>;
}

export interface ProviderRequestOptions {
  signal?: GlobalAbortSignal;
  headers?: ProviderHeaders;
  retry?: ProviderRetryOptions;
  [key: string]: unknown;
}

export interface SSEEvent<TData = unknown> {
  event: string;
  id: string | null;
  retry: number | null;
  data: TData;
}

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface SSERequestConfig {
  url?: string;
  method?: string;
  headers?: ProviderHeaders;
  signal?: GlobalAbortSignal;
  body?: BodyInit | null;
  [key: string]: unknown;
}

export interface SSEAdapterOptions<TRequest = Record<string, unknown>, TChatInput = unknown, TData = unknown> {
  name?: string;
  url?: string;
  method?: string;
  headers?: ProviderHeaders;
  fetch?: FetchLike;
  buildRequest?: (
    request: TRequest,
    requestOptions?: ProviderRequestOptions
  ) => MaybePromise<TRequest | string | SSERequestConfig>;
  buildChatRequest?: (input: TChatInput, requestOptions?: ProviderRequestOptions) => TRequest;
  parse?: (data: string, event: SSEEvent<string>) => MaybePromise<TData>;
  isError?: (event: SSEEvent<TData>) => MaybePromise<boolean>;
  getError?: (event: SSEEvent<TData>, name: string) => MaybePromise<string>;
  eventToText?: (
    event: SSEEvent<TData>,
    request: TRequest,
    requestOptions?: ProviderRequestOptions
  ) => MaybePromise<string | undefined>;
  retry?: ProviderRetryOptions;
}

export interface SSEAdapter<TRequest = Record<string, unknown>, TChatInput = unknown, TData = unknown> {
  stream(request?: TRequest, requestOptions?: ProviderRequestOptions): AsyncIterable<SSEEvent<TData>>;
  streamText(request?: TRequest, requestOptions?: ProviderRequestOptions): AsyncIterable<string>;
  chat(input: TChatInput, requestOptions?: ProviderRequestOptions): AsyncIterable<string>;
}

export interface LineEvent<TData = unknown> {
  line: number;
  raw: string;
  data: TData;
}

export interface LineRequestConfig {
  url?: string;
  method?: string;
  headers?: ProviderHeaders;
  signal?: GlobalAbortSignal;
  body?: BodyInit | null;
  [key: string]: unknown;
}

export interface LineAdapterOptions<TRequest = Record<string, unknown>, TChatInput = unknown, TData = unknown> {
  name?: string;
  url?: string;
  method?: string;
  headers?: ProviderHeaders;
  fetch?: FetchLike;
  buildRequest?: (
    request: TRequest,
    requestOptions?: ProviderRequestOptions
  ) => MaybePromise<TRequest | string | LineRequestConfig>;
  buildChatRequest?: (input: TChatInput, requestOptions?: ProviderRequestOptions) => TRequest;
  parse?: (line: string, event: LineEvent<string>) => MaybePromise<TData>;
  isError?: (event: LineEvent<TData>) => MaybePromise<boolean>;
  getError?: (event: LineEvent<TData>, name: string) => MaybePromise<string>;
  lineToText?: (
    event: LineEvent<TData>,
    request: TRequest,
    requestOptions?: ProviderRequestOptions
  ) => MaybePromise<string | undefined>;
}

export interface LineAdapter<TRequest = Record<string, unknown>, TChatInput = unknown, TData = unknown> {
  stream(request?: TRequest, requestOptions?: ProviderRequestOptions): AsyncIterable<LineEvent<TData>>;
  streamText(request?: TRequest, requestOptions?: ProviderRequestOptions): AsyncIterable<string>;
  chat(input: TChatInput, requestOptions?: ProviderRequestOptions): AsyncIterable<string>;
}

export interface OpenAIEvent {
  type: string;
  [key: string]: unknown;
}

export type OpenAIMessage = Record<string, unknown> & {
  role?: string;
  content?: unknown;
};

export type OpenAIChatInput = string | OpenAIMessage | OpenAIMessage[] | Record<string, unknown>;
export type OpenAIRequest = Record<string, unknown> & { input?: OpenAIChatInput };

export interface OpenAIOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  headers?: ProviderHeaders;
  fetch?: FetchLike;
  retry?: ProviderRetryOptions;
}

export interface OpenAIAdapter {
  responses: {
    stream(request: OpenAIRequest, requestOptions?: ProviderRequestOptions): AsyncIterable<OpenAIEvent>;
  };
  streamText(input: string | OpenAIRequest, requestOptions?: ProviderRequestOptions): AsyncIterable<string>;
  chat(input: OpenAIChatInput, requestOptions?: ProviderRequestOptions): AsyncIterable<string>;
}

export interface OpenRouterEvent {
  id?: string;
  model?: string;
  choices?: Array<{
    index?: number;
    finish_reason?: string | null;
    delta?: {
      role?: string;
      content?: string;
      [key: string]: unknown;
    };
  }>;
  [key: string]: unknown;
}

export type OpenRouterMessage = OpenAIMessage;
export type OpenRouterChatInput = string | OpenRouterMessage | OpenRouterMessage[] | Record<string, unknown>;
export type OpenRouterRequest = Record<string, unknown> & { messages?: OpenRouterChatInput };

export interface OpenRouterOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  headers?: ProviderHeaders;
  fetch?: FetchLike;
  retry?: ProviderRetryOptions;
}

export interface OpenRouterAdapter {
  chatCompletions: {
    stream(request: OpenRouterRequest, requestOptions?: ProviderRequestOptions): AsyncIterable<OpenRouterEvent>;
  };
  streamText(input: string | OpenRouterRequest, requestOptions?: ProviderRequestOptions): AsyncIterable<string>;
  chat(input: OpenRouterChatInput, requestOptions?: ProviderRequestOptions): AsyncIterable<string>;
}

export type DeepSeekEvent = OpenRouterEvent;
export type DeepSeekMessage = OpenRouterMessage;
export type DeepSeekChatInput = string | DeepSeekMessage | DeepSeekMessage[] | Record<string, unknown>;
export type DeepSeekRequest = Record<string, unknown> & { messages?: DeepSeekChatInput };

export interface DeepSeekOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  headers?: ProviderHeaders;
  fetch?: FetchLike;
  retry?: ProviderRetryOptions;
}

export interface DeepSeekAdapter {
  chatCompletions: {
    stream(request: DeepSeekRequest, requestOptions?: ProviderRequestOptions): AsyncIterable<DeepSeekEvent>;
  };
  streamText(input: string | DeepSeekRequest, requestOptions?: ProviderRequestOptions): AsyncIterable<string>;
  chat(input: DeepSeekChatInput, requestOptions?: ProviderRequestOptions): AsyncIterable<string>;
}

export interface AnthropicEvent {
  type: string;
  [key: string]: unknown;
}

export type AnthropicMessage = Record<string, unknown> & {
  role?: string;
  content?: unknown;
};

export type AnthropicChatInput = string | AnthropicMessage | AnthropicMessage[] | Record<string, unknown>;
export type AnthropicRequest = Record<string, unknown> & { messages?: AnthropicChatInput };

export interface AnthropicOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  version?: string;
  maxTokens?: number;
  headers?: ProviderHeaders;
  fetch?: FetchLike;
  retry?: ProviderRetryOptions;
}

export interface AnthropicAdapter {
  messages: {
    stream(request: AnthropicRequest, requestOptions?: ProviderRequestOptions): AsyncIterable<AnthropicEvent>;
  };
  streamText(messages: string | AnthropicRequest, requestOptions?: ProviderRequestOptions): AsyncIterable<string>;
  chat(input: AnthropicChatInput, requestOptions?: ProviderRequestOptions): AsyncIterable<string>;
}

export interface OllamaEvent {
  model?: string;
  created_at?: string;
  message?: {
    role?: string;
    content?: string;
    [key: string]: unknown;
  };
  done?: boolean;
  done_reason?: string | null;
  error?: string;
  [key: string]: unknown;
}

export type OllamaMessage = Record<string, unknown> & {
  role?: string;
  content?: unknown;
};

export type OllamaChatInput = string | OllamaMessage | OllamaMessage[] | Record<string, unknown>;
export type OllamaRequest = Record<string, unknown> & { messages?: OllamaChatInput };

export interface OllamaOptions {
  baseURL?: string;
  model?: string;
  headers?: ProviderHeaders;
  fetch?: FetchLike;
}

export interface OllamaAdapter {
  stream(request: OllamaRequest, requestOptions?: ProviderRequestOptions): AsyncIterable<OllamaEvent>;
  streamText(input: string | OllamaRequest, requestOptions?: ProviderRequestOptions): AsyncIterable<string>;
  chat(input: OllamaChatInput, requestOptions?: ProviderRequestOptions): AsyncIterable<string>;
}
