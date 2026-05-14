import type { GlobalAbortSignal, MaybePromise } from '../core/response.js';

export type ProviderHeaders = Record<string, string>;

export interface ProviderRequestOptions {
  signal?: GlobalAbortSignal;
  headers?: ProviderHeaders;
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
}

export interface SSEAdapter<TRequest = Record<string, unknown>, TChatInput = unknown, TData = unknown> {
  stream(request?: TRequest, requestOptions?: ProviderRequestOptions): AsyncIterable<SSEEvent<TData>>;
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
}

export interface OpenAIAdapter {
  responses: {
    stream(request: OpenAIRequest, requestOptions?: ProviderRequestOptions): AsyncIterable<OpenAIEvent>;
  };
  streamText(input: string | OpenAIRequest, requestOptions?: ProviderRequestOptions): AsyncIterable<string>;
  chat(input: OpenAIChatInput, requestOptions?: ProviderRequestOptions): AsyncIterable<string>;
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
}

export interface AnthropicAdapter {
  messages: {
    stream(request: AnthropicRequest, requestOptions?: ProviderRequestOptions): AsyncIterable<AnthropicEvent>;
  };
  streamText(messages: string | AnthropicRequest, requestOptions?: ProviderRequestOptions): AsyncIterable<string>;
  chat(input: AnthropicChatInput, requestOptions?: ProviderRequestOptions): AsyncIterable<string>;
}
