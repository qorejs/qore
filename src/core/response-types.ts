import type { ComputedSignal, Signal } from './signal.js';

export type MaybePromise<T> = T | Promise<T>;
export type ResponseStatus = 'idle' | 'pending' | 'streaming' | 'completed' | 'error' | 'aborted';

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

export type SourceLike<T> = T | Iterable<T> | AsyncIterable<T> | null | undefined;

export interface ResponseReactiveState<TChunk, TValue> {
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
}

export interface ResponseConsumeContext<TChunk, TValue> {
  signal: AbortSignal;
  response: ResponseState<TChunk, TValue>;
}

export interface ResponseExecutorContext<TChunk, TValue> {
  readonly signal: AbortSignal;
  response: ResponseState<TChunk, TValue>;
  push(chunk: TChunk): TValue;
  complete(): TValue;
  fail(reason?: unknown): Error | TValue;
  abort(reason?: unknown): TValue;
}

export type ResponseSourceFactory<TChunk, TValue> = (
  context: ResponseConsumeContext<TChunk, TValue>
) => MaybePromise<SourceLike<TChunk>>;

export type ResponseSource<TChunk, TValue> = SourceLike<TChunk> | ResponseSourceFactory<TChunk, TValue>;

export interface CreateResponseOptions<TChunk, TValue> {
  seed: TValue;
  reduce: (currentValue: TValue, chunk: TChunk, index: number) => TValue;
}

export interface ResponseState<TChunk = unknown, TValue = unknown> extends ResponseReactiveState<TChunk, TValue> {
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
  create<TChunk, TValue>(options: CreateResponseOptions<TChunk, TValue>): ResponseState<TChunk, TValue>;
  text<TChunk = string>(seed?: string): ResponseState<TChunk, string>;
  list<TChunk>(seed?: TChunk[]): ResponseState<TChunk, TChunk[]>;
  latest<TChunk>(seed?: TChunk | null): ResponseState<TChunk, TChunk | null>;
}
