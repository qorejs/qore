import type { ReadonlySignal } from './signal.js';
import type {
  GlobalAbortSignal,
  MaybePromise,
  ResponseSnapshot,
  ResponseState,
  ResponseStatus,
  SourceLike
} from './response.js';

export type OverflowStrategy = 'wait' | 'drop-oldest' | 'drop-newest' | 'error';

export interface BackpressureOptions {
  interval?: number;
  buffer?: number;
  overflow?: OverflowStrategy;
}

export type RetryBackoff =
  | number
  | number[]
  | 'exponential'
  | ((retry: number, error: unknown) => MaybePromise<number>);

export interface NormalizedBackpressure {
  interval: number;
  buffer: number;
  overflow: OverflowStrategy;
}

export interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T | PromiseLike<T>): void;
  reject(reason?: unknown): void;
}

export interface StreamOptions<TChunk = unknown, TValue = string> {
  seed?: TValue;
  reduce?: (currentValue: TValue, chunk: TChunk, index: number) => TValue;
  backpressure?: number | BackpressureOptions | null;
}

export interface StreamEventBase<TType extends string = string> {
  type: TType;
}

export type StreamEventType<TEvent extends StreamEventBase> = TEvent['type'] & string;

export type StreamEventOf<
  TEvent extends StreamEventBase,
  TType extends StreamEventType<TEvent>
> = Extract<TEvent, { type: TType }>;

export type StreamEventOptions<TEvent extends StreamEventBase> = Omit<
  StreamOptions<TEvent, TEvent[]>,
  'seed' | 'reduce'
>;

export type StreamSelectOptions<
  TEvent extends StreamEventBase,
  TValue
> = StreamOptions<TEvent, TValue>;

export interface RetryableStreamOptions<TChunk = unknown, TValue = string> extends StreamOptions<TChunk, TValue> {
  maxRetries?: number;
  backoff?: RetryBackoff;
}

export type StreamPipeStage<TChunk = unknown, TValue = string> = (
  value: TValue,
  index: number
) => MaybePromise<StreamInput<TChunk, TValue>>;

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
  status: ReadonlySignal<ResponseStatus>;
  error: ReadonlySignal<Error | null>;
  chunks: ReadonlySignal<TChunk[]>;
  startedAt: ReadonlySignal<number | null>;
  finishedAt: ReadonlySignal<number | null>;
  pending: ReadonlySignal<boolean>;
  streaming: ReadonlySignal<boolean>;
  completed: ReadonlySignal<boolean>;
  failed: ReadonlySignal<boolean>;
  aborted: ReadonlySignal<boolean>;
  chunkCount: ReadonlySignal<number>;
  buffered: ReadonlySignal<number>;
  dropped: ReadonlySignal<number>;
  snapshot(): ResponseSnapshot<TChunk, TValue>;
  ready: Promise<TValue>;
  abort(reason?: unknown): TValue;
  readonly signal?: GlobalAbortSignal | null;
}

export interface QoreEventStream<TEvent extends StreamEventBase = StreamEventBase>
  extends QoreStream<TEvent, TEvent[]> {
  select<TType extends StreamEventType<TEvent>>(
    type: TType
  ): QoreStream<StreamEventOf<TEvent, TType>, Array<StreamEventOf<TEvent, TType>>>;
  select<TType extends StreamEventType<TEvent>, TValue>(
    type: TType,
    options: StreamSelectOptions<StreamEventOf<TEvent, TType>, TValue>
  ): QoreStream<StreamEventOf<TEvent, TType>, TValue>;
}

export interface StreamFactory {
  <TChunk = unknown>(
    sourceOrSetup: StreamInput<TChunk, string>,
    options?: StreamOptions<TChunk, string>
  ): QoreStream<TChunk, string>;
  create<TChunk, TValue = string>(
    sourceOrSetup: StreamInput<TChunk, TValue>,
    options?: StreamOptions<TChunk, TValue>
  ): QoreStream<TChunk, TValue>;
  text<TChunk = unknown>(
    sourceOrSetup: StreamInput<TChunk, string>,
    options?: StreamOptions<TChunk, string>
  ): QoreStream<TChunk, string>;
  list<TChunk>(
    sourceOrSetup: StreamInput<TChunk, TChunk[]>,
    options?: StreamOptions<TChunk, TChunk[]>
  ): QoreStream<TChunk, TChunk[]>;
  latest<TChunk>(
    sourceOrSetup: StreamInput<TChunk, TChunk | null>,
    options?: StreamOptions<TChunk, TChunk | null>
  ): QoreStream<TChunk, TChunk | null>;
  events<TEvent extends StreamEventBase>(
    sourceOrSetup: StreamInput<TEvent, TEvent[]>,
    options?: StreamEventOptions<TEvent>
  ): QoreEventStream<TEvent>;
  withBackpressure<TChunk = unknown, TValue = string>(
    sourceOrSetup: StreamInput<TChunk, TValue>,
    backpressure: number | BackpressureOptions,
    options?: StreamOptions<TChunk, TValue>
  ): QoreStream<TChunk, TValue>;
  paced<TChunk = unknown, TValue = string>(
    sourceOrSetup: StreamInput<TChunk, TValue>,
    interval: number,
    options?: StreamOptions<TChunk, TValue>
  ): QoreStream<TChunk, TValue>;
  merge<TChunk = unknown, TValue = string>(
    sources: Array<SourceLike<TChunk>>,
    options?: StreamOptions<TChunk, TValue>
  ): QoreStream<TChunk, TValue>;
  concat<TChunk = unknown, TValue = string>(
    sources: Array<SourceLike<TChunk>>,
    options?: StreamOptions<TChunk, TValue>
  ): QoreStream<TChunk, TValue>;
  pipe<TChunk = unknown, TValue = string>(
    sourceOrSetup: StreamInput<TChunk, TValue>,
    stages: Array<StreamPipeStage<TChunk, TValue>>,
    options?: StreamOptions<TChunk, TValue>
  ): QoreStream<TChunk, TValue>;
  race<TChunk = unknown, TValue = string>(
    sources: Array<SourceLike<TChunk>>,
    options?: StreamOptions<TChunk, TValue>
  ): QoreStream<TChunk, TValue>;
  retryable<TChunk = unknown, TValue = string>(
    sourceFactory: (attempt: number) => StreamInput<TChunk, TValue>,
    options?: RetryableStreamOptions<TChunk, TValue>
  ): QoreStream<TChunk, TValue>;
  switchMap<TInput, TChunk = unknown, TValue = string>(
    source: SourceLike<TInput>,
    mapper: (value: TInput, index: number) => MaybePromise<SourceLike<TChunk>>,
    options?: StreamOptions<TChunk, TValue>
  ): QoreStream<TChunk, TValue>;
}

export type StreamResponseState<TChunk, TValue> = ResponseState<TChunk, TValue>;
