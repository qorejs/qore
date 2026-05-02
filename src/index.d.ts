export type MaybePromise<T> = T | Promise<T>;
export type ResponseStatus = 'idle' | 'pending' | 'streaming' | 'completed' | 'error' | 'aborted';
export type OverflowStrategy = 'wait' | 'drop-oldest' | 'drop-newest' | 'error';

type GlobalNode = typeof globalThis extends { Node: infer T } ? T : unknown;
type GlobalElement = typeof globalThis extends { Element: infer T } ? T : unknown;
type GlobalText = typeof globalThis extends { Text: infer T } ? T : unknown;
type GlobalDocumentFragment = typeof globalThis extends { DocumentFragment: infer T } ? T : unknown;
type GlobalAbortSignal = typeof globalThis extends { AbortSignal: infer T }
  ? T extends { prototype: infer P }
    ? P
    : unknown
  : { aborted: boolean; reason?: unknown };

export interface SubscribeOptions {
  immediate?: boolean;
}

export interface ReadonlySignal<T> {
  (): T;
  peek(): T;
  subscribe(listener: (value: T) => void, options?: SubscribeOptions): () => void;
}

export interface Signal<T> extends ReadonlySignal<T> {
  (nextValue: T): T;
  set(nextValue: T): T;
  update(updater: (currentValue: T) => T): T;
}

export interface ComputedSignal<T> extends ReadonlySignal<T> {
  stop(): void;
}

export function signal<T>(initialValue: T): Signal<T>;
export function computed<T>(getter: () => T): ComputedSignal<T>;
export function effect(fn: () => void | (() => void)): () => void;
export function batch<T>(fn: () => T): T;
export function untrack<T>(fn: () => T): T;
export function isSignal<T = unknown>(value: unknown): value is ReadonlySignal<T>;

export interface ResponseSnapshot<TChunk = unknown, TValue = unknown> {
  status: ResponseStatus;
  value: TValue;
  error: Error | null;
  chunks: TChunk[];
  startedAt: number | null;
  finishedAt: number | null;
  chunkCount: number;
}

export interface ResponseRunOptions<TValue> {
  resetValue?: boolean;
  nextSeed?: TValue;
}

export interface ResponseConsumeContext<TChunk, TValue> {
  signal: GlobalAbortSignal;
  response: ResponseState<TChunk, TValue>;
}

export interface ResponseExecutorContext<TChunk, TValue> {
  readonly signal: GlobalAbortSignal;
  response: ResponseState<TChunk, TValue>;
  push(chunk: TChunk): TValue;
  complete(): TValue;
  fail(reason?: unknown): Error | TValue;
  abort(reason?: unknown): TValue;
}

export type SourceLike<T> = T | Iterable<T> | AsyncIterable<T> | null | undefined;
export type ResponseSourceFactory<TChunk, TValue> = (
  context: ResponseConsumeContext<TChunk, TValue>
) => MaybePromise<SourceLike<TChunk>>;
export type ResponseSource<TChunk, TValue> = SourceLike<TChunk> | ResponseSourceFactory<TChunk, TValue>;

export interface ResponseState<TChunk = unknown, TValue = unknown> {
  status: Signal<ResponseStatus>;
  value: Signal<TValue>;
  error: Signal<Error | null>;
  chunks: Signal<TChunk[]>;
  startedAt: Signal<number | null>;
  finishedAt: Signal<number | null>;
  pending: ComputedSignal<boolean>;
  streaming: ComputedSignal<boolean>;
  completed: ComputedSignal<boolean>;
  failed: ComputedSignal<boolean>;
  aborted: ComputedSignal<boolean>;
  chunkCount: ComputedSignal<number>;
  reset(nextSeed?: TValue): TValue;
  push(chunk: TChunk): TValue;
  complete(): TValue;
  fail(reason?: unknown): Error | TValue;
  abort(reason?: unknown): TValue;
  run(
    executor: (context: ResponseExecutorContext<TChunk, TValue>) => MaybePromise<unknown>,
    options?: ResponseRunOptions<TValue>
  ): Promise<TValue>;
  consume(source: ResponseSource<TChunk, TValue>, options?: ResponseRunOptions<TValue>): Promise<TValue>;
  snapshot(): ResponseSnapshot<TChunk, TValue>;
}

export interface ResponseFactory {
  create<TChunk, TValue>(options: {
    seed: TValue;
    reduce: (currentValue: TValue, chunk: TChunk, index: number) => TValue;
  }): ResponseState<TChunk, TValue>;
  text<TChunk = string>(seed?: string): ResponseState<TChunk, string>;
  list<TChunk>(seed?: TChunk[]): ResponseState<TChunk, TChunk[]>;
  latest<TChunk>(seed?: TChunk | null): ResponseState<TChunk, TChunk | null>;
}

export function createResponse<TChunk, TValue>(options: {
  seed: TValue;
  reduce: (currentValue: TValue, chunk: TChunk, index: number) => TValue;
}): ResponseState<TChunk, TValue>;
export const response: ResponseFactory;

export interface BackpressureOptions {
  interval?: number;
  buffer?: number;
  overflow?: OverflowStrategy;
}

export interface StreamOptions<TChunk = unknown, TValue = string> {
  seed?: TValue;
  reduce?: (currentValue: TValue, chunk: TChunk, index: number) => TValue;
  backpressure?: number | BackpressureOptions | null;
}

export interface StreamController<TChunk = unknown, TValue = string> {
  readonly signal: GlobalAbortSignal;
  push(chunk: TChunk): Promise<TValue>;
  done(): TValue;
  fail(error?: unknown): Error | TValue;
  abort(reason?: unknown): TValue;
}

export type StreamSetup<TChunk, TValue> = (
  controller: StreamController<TChunk, TValue>
) => MaybePromise<void | SourceLike<TChunk>>;
export type StreamInput<TChunk, TValue> = SourceLike<TChunk> | StreamSetup<TChunk, TValue>;

export interface QoreStream<TChunk = unknown, TValue = string> extends ReadonlySignal<TValue>, AsyncIterable<TChunk> {
  status: Signal<ResponseStatus>;
  error: Signal<Error | null>;
  chunks: Signal<TChunk[]>;
  startedAt: Signal<number | null>;
  finishedAt: Signal<number | null>;
  pending: ComputedSignal<boolean>;
  streaming: ComputedSignal<boolean>;
  completed: ComputedSignal<boolean>;
  failed: ComputedSignal<boolean>;
  aborted: ComputedSignal<boolean>;
  chunkCount: ComputedSignal<number>;
  buffered: ReadonlySignal<number>;
  dropped: ReadonlySignal<number>;
  snapshot(): ResponseSnapshot<TChunk, TValue>;
  ready: Promise<TValue>;
  abort(reason?: unknown): TValue;
  readonly signal?: GlobalAbortSignal | null;
}

export function createStream<TChunk, TValue = string>(
  sourceOrSetup: StreamInput<TChunk, TValue>,
  options?: StreamOptions<TChunk, TValue>
): QoreStream<TChunk, TValue>;

export function stream<TChunk = unknown>(
  sourceOrSetup: StreamInput<TChunk, string>,
  options?: StreamOptions<TChunk, string>
): QoreStream<TChunk, string>;
export namespace stream {
  function create<TChunk, TValue = string>(
    sourceOrSetup: StreamInput<TChunk, TValue>,
    options?: StreamOptions<TChunk, TValue>
  ): QoreStream<TChunk, TValue>;
  function text<TChunk = unknown>(
    sourceOrSetup: StreamInput<TChunk, string>,
    options?: StreamOptions<TChunk, string>
  ): QoreStream<TChunk, string>;
  function list<TChunk>(
    sourceOrSetup: StreamInput<TChunk, TChunk[]>,
    options?: StreamOptions<TChunk, TChunk[]>
  ): QoreStream<TChunk, TChunk[]>;
  function latest<TChunk>(
    sourceOrSetup: StreamInput<TChunk, TChunk | null>,
    options?: StreamOptions<TChunk, TChunk | null>
  ): QoreStream<TChunk, TChunk | null>;
  function withBackpressure<TChunk = unknown, TValue = string>(
    sourceOrSetup: StreamInput<TChunk, TValue>,
    backpressure: number | BackpressureOptions,
    options?: StreamOptions<TChunk, TValue>
  ): QoreStream<TChunk, TValue>;
  function paced<TChunk = unknown, TValue = string>(
    sourceOrSetup: StreamInput<TChunk, TValue>,
    interval: number,
    options?: StreamOptions<TChunk, TValue>
  ): QoreStream<TChunk, TValue>;
}

export function from<TChunk, TValue = string>(
  source: SourceLike<TChunk>,
  options?: StreamOptions<TChunk, TValue> & { delay?: number }
): QoreStream<TChunk, TValue>;
export function mapStream<TInput, TOutput, TValue = string>(
  source: SourceLike<TInput>,
  mapper: (chunk: TInput, index: number) => MaybePromise<TOutput>,
  options?: StreamOptions<TOutput, TValue>
): QoreStream<TOutput, TValue>;
export function scanStream<TInput, TOutput>(
  source: SourceLike<TInput>,
  reducer: (currentValue: TOutput, chunk: TInput, index: number) => MaybePromise<TOutput>,
  seed: TOutput,
  options?: Omit<StreamOptions<TOutput, TOutput>, 'seed' | 'reduce'>
): QoreStream<TOutput, TOutput>;
export function toAsyncIterable<T>(source: SourceLike<T>): AsyncIterable<T>;

export type ReactiveValue<T> = T | ReadonlySignal<T> | (() => T);
export type QoreChild =
  | GlobalNode
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined
  | ReactiveValue<unknown>
  | QoreChild[];

export interface ResponseRenderState<TChunk = unknown, TValue = unknown> {
  response: ResponseState<TChunk, TValue>;
  status: ResponseStatus;
  value: TValue;
  error: Error | null;
  chunks: TChunk[];
  startedAt: number | null;
  finishedAt: number | null;
  pending: boolean;
  streaming: boolean;
  completed: boolean;
  failed: boolean;
  aborted: boolean;
  chunkCount: number;
}

export function fragment(...children: QoreChild[]): GlobalDocumentFragment;
export function dynamic<T>(
  source: ReactiveValue<T>,
  render?: (value: T) => QoreChild
): GlobalDocumentFragment;
export function show<T>(
  source: ReactiveValue<T>,
  render?: (value: T) => QoreChild,
  fallback?: QoreChild | ((value: T) => QoreChild)
): GlobalDocumentFragment;
export function list<T>(
  source: ReactiveValue<Iterable<T> | ArrayLike<T> | null | undefined>,
  render: (item: T, index: number) => QoreChild,
  options?: { fallback?: QoreChild | ((items: T[]) => QoreChild) }
): GlobalDocumentFragment;
export function renderResponse<TChunk, TValue>(
  responseState: ResponseState<TChunk, TValue>,
  views?: Partial<Record<ResponseStatus | 'default', QoreChild | ((state: ResponseRenderState<TChunk, TValue>) => QoreChild)>>
): GlobalDocumentFragment;
export function h(tag: string, props?: Record<string, unknown> | null, ...children: QoreChild[]): GlobalElement;
export function h<TProps extends Record<string, unknown>>(
  tag: (props: TProps & { children: QoreChild[] }) => QoreChild,
  props?: TProps | null,
  ...children: QoreChild[]
): QoreChild;
export function text(valueOrGetter: ReactiveValue<unknown>): GlobalText;
export function mount(root: string | GlobalElement, view: QoreChild | (() => QoreChild)): () => GlobalElement;

export interface AppContext<Props extends Record<string, unknown> = Record<string, unknown>> {
  app: QoreApp<Props>;
  root: GlobalElement;
  props: Props;
  signal: typeof signal;
  computed: typeof computed;
  effect: typeof effect;
  batch: typeof batch;
  untrack: typeof untrack;
  stream: typeof stream;
  from: typeof from;
  mapStream: typeof mapStream;
  scanStream: typeof scanStream;
  response: typeof response;
  h: typeof h;
  text: typeof text;
  dynamic: typeof dynamic;
  show: typeof show;
  list: typeof list;
  fragment: typeof fragment;
  renderResponse: typeof renderResponse;
  onCleanup(handler: () => void): () => void;
}

export type AppSetupResult =
  | QoreChild
  | {
      view?: QoreChild | (() => QoreChild);
      onMount?: (root: GlobalElement) => void;
    };

export interface QoreApp<Props extends Record<string, unknown> = Record<string, unknown>> {
  mount(target: string | GlobalElement, props?: Props): GlobalElement;
  unmount(): QoreApp<Props>;
  readonly root: GlobalElement | null;
}

export function createApp<Props extends Record<string, unknown> = Record<string, unknown>>(
  setup: (context: AppContext<Props>) => AppSetupResult
): QoreApp<Props>;

export interface ProviderRequestOptions {
  signal?: GlobalAbortSignal;
  headers?: Record<string, string>;
  [key: string]: unknown;
}

export interface SSEEvent<TData = unknown> {
  event: string;
  id: string | null;
  retry: number | null;
  data: TData;
}

export interface SSEAdapterOptions<TRequest = Record<string, unknown>, TChatInput = unknown, TData = unknown> {
  name?: string;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  fetch?: (...args: any[]) => Promise<any>;
  buildRequest?: (
    request: TRequest,
    requestOptions?: ProviderRequestOptions
  ) => MaybePromise<TRequest | string | { url?: string; method?: string; headers?: Record<string, string>; signal?: GlobalAbortSignal; body?: unknown; [key: string]: unknown }>;
  buildChatRequest?: (input: TChatInput, requestOptions?: ProviderRequestOptions) => TRequest;
  parse?: (data: string, event: SSEEvent<string>) => MaybePromise<TData>;
  isError?: (event: SSEEvent<TData>) => MaybePromise<boolean>;
  getError?: (event: SSEEvent<TData>, name: string) => MaybePromise<string>;
  eventToText?: (event: SSEEvent<TData>, request: TRequest, requestOptions?: ProviderRequestOptions) => MaybePromise<string | undefined>;
}

export interface SSEAdapter<TRequest = Record<string, unknown>, TChatInput = unknown, TData = unknown> {
  stream(request?: TRequest, requestOptions?: ProviderRequestOptions): AsyncIterable<SSEEvent<TData>>;
  streamText(request?: TRequest, requestOptions?: ProviderRequestOptions): AsyncIterable<string>;
  chat(input: TChatInput, requestOptions?: ProviderRequestOptions): AsyncIterable<string>;
}

export function createSSEAdapter<TRequest = Record<string, unknown>, TChatInput = unknown, TData = unknown>(
  options?: SSEAdapterOptions<TRequest, TChatInput, TData>
): SSEAdapter<TRequest, TChatInput, TData>;

export interface OpenAIEvent {
  type: string;
  [key: string]: unknown;
}

export interface OpenAIOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  headers?: Record<string, string>;
  fetch?: (...args: any[]) => Promise<any>;
}

export interface OpenAIAdapter {
  responses: {
    stream(request: Record<string, unknown>, requestOptions?: ProviderRequestOptions): AsyncIterable<OpenAIEvent>;
  };
  streamText(input: string | Record<string, unknown>, requestOptions?: ProviderRequestOptions): AsyncIterable<string>;
  chat(input: string | Record<string, unknown> | Array<Record<string, unknown>>, requestOptions?: ProviderRequestOptions): AsyncIterable<string>;
}

export function createOpenAI(options?: OpenAIOptions): OpenAIAdapter;

export interface AnthropicEvent {
  type: string;
  [key: string]: unknown;
}

export interface AnthropicOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  version?: string;
  maxTokens?: number;
  headers?: Record<string, string>;
  fetch?: (...args: any[]) => Promise<any>;
}

export interface AnthropicAdapter {
  messages: {
    stream(request: Record<string, unknown>, requestOptions?: ProviderRequestOptions): AsyncIterable<AnthropicEvent>;
  };
  streamText(messages: string | Record<string, unknown>, requestOptions?: ProviderRequestOptions): AsyncIterable<string>;
  chat(input: string | Record<string, unknown> | Array<Record<string, unknown>>, requestOptions?: ProviderRequestOptions): AsyncIterable<string>;
}

export function createAnthropic(options?: AnthropicOptions): AnthropicAdapter;

export function normalizeError(error: unknown): Error;
export function sleep(ms: number, signal?: GlobalAbortSignal): Promise<void>;
