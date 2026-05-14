import type { ResponseState, ResponseStatus } from '../core/response.js';
import type { ReadonlySignal } from '../core/signal.js';

export type ReactiveValue<T> = T | ReadonlySignal<T> | (() => T);

export type QoreChild =
  | Node
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined
  | ReactiveValue<unknown>
  | QoreChild[];

export type QoreTemplate<T> = QoreChild | ((value: T) => QoreChild);

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

export type ResponseViews<TChunk = unknown, TValue = unknown> = Partial<
  Record<ResponseStatus | 'default', QoreTemplate<ResponseRenderState<TChunk, TValue>>>
>;

export type QoreComponent<Props extends Record<string, unknown> = Record<string, unknown>> = (
  props: Props & { children: QoreChild[] }
) => QoreChild;

export type MountTarget = string | Element;
export type MountView = QoreChild | (() => QoreChild);
