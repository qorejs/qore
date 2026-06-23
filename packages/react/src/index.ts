import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type {
  QoreStream,
  ReadonlySignal,
  ResponseStatus,
  StreamInput
} from '@qorejs/qore';
import { stream } from '@qorejs/qore';
import type { DependencyList } from 'react';

const noop = (): void => undefined;

export interface UseQoreSignalOptions<T> {
  getServerSnapshot?: () => T;
}

export interface UseQoreStreamOptions<TValue> {
  initialValue: TValue;
}

export interface QoreReactStream<TChunk, TValue> {
  stream: QoreStream<TChunk, TValue> | null;
  value: TValue;
  status: ResponseStatus;
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
  buffered: number;
  dropped: number;
  abort(reason?: unknown): TValue | null;
}

export function useQoreSignal<T>(
  source: ReadonlySignal<T>,
  options: UseQoreSignalOptions<T> = {}
): T {
  const subscribe = useCallback((onStoreChange: () => void) => source.subscribe(onStoreChange), [source]);
  const getSnapshot = useCallback(() => source.peek(), [source]);
  const getServerSnapshot = options.getServerSnapshot ?? getSnapshot;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function useOptionalQoreSignal<T>(
  source: ReadonlySignal<T> | null,
  fallback: T
): T {
  const subscribe = useCallback(
    (onStoreChange: () => void) => source?.subscribe(onStoreChange) ?? noop,
    [source]
  );
  const getSnapshot = useCallback(() => source?.peek() ?? fallback, [source, fallback]);
  const getServerSnapshot = useCallback(() => fallback, [fallback]);

  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
}

export function useQoreStreamSnapshot<TChunk, TValue>(
  source: QoreStream<TChunk, TValue> | null,
  options: UseQoreStreamOptions<TValue>
): QoreReactStream<TChunk, TValue> {
  const emptyChunks = useMemo(() => [] as TChunk[], []);
  const value = useOptionalQoreSignal(source, options.initialValue);
  const status = useOptionalQoreSignal(source?.status ?? null, 'idle' as ResponseStatus);
  const error = useOptionalQoreSignal(source?.error ?? null, null);
  const chunks = useOptionalQoreSignal(source?.chunks ?? null, emptyChunks);
  const startedAt = useOptionalQoreSignal(source?.startedAt ?? null, null);
  const finishedAt = useOptionalQoreSignal(source?.finishedAt ?? null, null);
  const pending = useOptionalQoreSignal(source?.pending ?? null, false);
  const streaming = useOptionalQoreSignal(source?.streaming ?? null, false);
  const completed = useOptionalQoreSignal(source?.completed ?? null, false);
  const failed = useOptionalQoreSignal(source?.failed ?? null, false);
  const aborted = useOptionalQoreSignal(source?.aborted ?? null, false);
  const chunkCount = useOptionalQoreSignal(source?.chunkCount ?? null, 0);
  const buffered = useOptionalQoreSignal(source?.buffered ?? null, 0);
  const dropped = useOptionalQoreSignal(source?.dropped ?? null, 0);

  const abort = useCallback((reason?: unknown) => source?.abort(reason) ?? null, [source]);

  return useMemo(() => ({
    stream: source,
    value,
    status,
    error,
    chunks,
    startedAt,
    finishedAt,
    pending,
    streaming,
    completed,
    failed,
    aborted,
    chunkCount,
    buffered,
    dropped,
    abort
  }), [
    source,
    value,
    status,
    error,
    chunks,
    startedAt,
    finishedAt,
    pending,
    streaming,
    completed,
    failed,
    aborted,
    chunkCount,
    buffered,
    dropped,
    abort
  ]);
}

export function useQoreStream<TChunk = unknown, TValue = string>(
  createStream: () => QoreStream<TChunk, TValue>,
  dependencies: DependencyList,
  options: UseQoreStreamOptions<TValue>
): QoreReactStream<TChunk, TValue> {
  const [currentStream, setCurrentStream] = useState<QoreStream<TChunk, TValue> | null>(null);

  useEffect(() => {
    const nextStream = createStream();
    setCurrentStream(nextStream);

    return () => {
      nextStream.abort();
    };
  }, dependencies);

  return useQoreStreamSnapshot(currentStream, options);
}

export function useQoreTextStream(
  sourceFactory: () => StreamInput<unknown, string>,
  dependencies: DependencyList,
  initialValue = ''
): QoreReactStream<unknown, string> {
  return useQoreStream(
    () => stream(sourceFactory()),
    dependencies,
    { initialValue }
  );
}
