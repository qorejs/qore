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
}

export type StreamResponseState<TChunk, TValue> = ResponseState<TChunk, TValue>;
