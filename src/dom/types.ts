import type { ResponseState, ResponseStatus } from '../core/response.js';
import type { ReadonlySignal } from '../core/signal.js';

export type QoreNode = Node;
export type QoreElement = Element;
export type QoreText = Text;
export type QoreDocumentFragment = DocumentFragment;

// Backward-compatible aliases for users who imported the previous public names.
export type GlobalNode = QoreNode;
export type GlobalElement = QoreElement;
export type GlobalText = QoreText;
export type GlobalDocumentFragment = QoreDocumentFragment;

export type ReactiveValue<T> = T | ReadonlySignal<T> | (() => T);

export type QoreChild =
  | QoreNode
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

export type MountTarget = string | QoreElement;
export type MountView = QoreChild | (() => QoreChild);
