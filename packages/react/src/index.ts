import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type {
  QoreStream,
  ReadonlySignal,
  ResponseStatus,
  SubscribeOptions,
  StreamInput
} from '@qorejs/qore';
import { stream } from '@qorejs/qore';
import type { DependencyList } from 'react';

const noop = (): void => undefined;
const objectIs = Object.is as <T>(left: T, right: T) => boolean;

type ReadonlySignalSource<TValue> = {
  peek(): TValue;
  subscribe(listener: (value: TValue) => void, options?: SubscribeOptions): () => void;
};

type QoreStreamSnapshotSource<TChunk, TValue> = ReadonlySignalSource<TValue> & AsyncIterable<TChunk> & {
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
  ready: Promise<TValue>;
  abort(reason?: unknown): TValue;
};

type QoreStreamChunk<TStream> = TStream extends QoreStreamSnapshotSource<infer TChunk, infer _TValue> ? TChunk : never;
type QoreStreamValue<TStream> = TStream extends QoreStreamSnapshotSource<infer _TChunk, infer TValue> ? TValue : never;
type ReadonlySignalValue<TSignal> = TSignal extends ReadonlySignalSource<infer TValue> ? TValue : never;

export interface UseQoreSignalOptions<T> {
  getServerSnapshot?: () => T;
}

export interface UseQoreSignalSelectorOptions<TSelected> {
  isEqual?: (previous: TSelected, next: TSelected) => boolean;
  getServerSnapshot?: () => TSelected;
}

export interface UseQoreStreamOptions<TValue> {
  initialValue: TValue;
  enabled?: boolean;
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

export function useQoreSignal<TSignal extends ReadonlySignalSource<unknown>>(
  source: TSignal,
  options?: UseQoreSignalOptions<ReadonlySignalValue<TSignal>>
): ReadonlySignalValue<TSignal>;

export function useQoreSignal<T>(
  source: ReadonlySignalSource<T>,
  options: UseQoreSignalOptions<T> = {}
): T {
  const subscribe = useCallback((onStoreChange: () => void) => source.subscribe(onStoreChange), [source]);
  const getSnapshot = useCallback(() => source.peek(), [source]);
  const getServerSnapshot = options.getServerSnapshot ?? getSnapshot;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useQoreSignalSelector<
  TSignal extends ReadonlySignalSource<unknown>,
  TSelected
>(
  source: TSignal,
  selector: (value: ReadonlySignalValue<TSignal>) => TSelected,
  options?: UseQoreSignalSelectorOptions<TSelected>
): TSelected;

export function useQoreSignalSelector<TValue, TSelected>(
  source: ReadonlySignalSource<TValue>,
  selector: (value: TValue) => TSelected,
  options: UseQoreSignalSelectorOptions<TSelected> = {}
): TSelected {
  const selectorRef = useRef(selector);
  const equalityRef = useRef(options.isEqual ?? objectIs<TSelected>);
  const selectedRef = useRef<{ sourceValue: TValue; selectedValue: TSelected } | null>(null);

  selectorRef.current = selector;
  equalityRef.current = options.isEqual ?? objectIs<TSelected>;

  const getSelectedSnapshot = useCallback(() => {
    const sourceValue = source.peek();
    const selectedValue = selectorRef.current(sourceValue);
    const previous = selectedRef.current;

    if (previous && equalityRef.current(previous.selectedValue, selectedValue)) {
      return previous.selectedValue;
    }

    selectedRef.current = { sourceValue, selectedValue };
    return selectedValue;
  }, [source]);

  const subscribe = useCallback((onStoreChange: () => void) => source.subscribe(onStoreChange), [source]);
  const getServerSnapshot = options.getServerSnapshot ?? getSelectedSnapshot;

  return useSyncExternalStore(subscribe, getSelectedSnapshot, getServerSnapshot);
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

export function useQoreStreamSnapshot<TStream extends QoreStreamSnapshotSource<unknown, unknown>>(
  source: TStream,
  options: UseQoreStreamOptions<QoreStreamValue<TStream>>
): QoreReactStream<QoreStreamChunk<TStream>, QoreStreamValue<TStream>>;

export function useQoreStreamSnapshot<TChunk, TValue>(
  source: QoreStream<TChunk, TValue> | null,
  options: UseQoreStreamOptions<TValue>
): QoreReactStream<TChunk, TValue>;

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
  const enabled = options.enabled ?? true;

  useEffect(() => {
    if (!enabled) {
      setCurrentStream((previousStream) => {
        previousStream?.abort('Qore stream disabled');
        return null;
      });
      return noop;
    }

    const nextStream = createStream();
    setCurrentStream(nextStream);

    return () => {
      nextStream.abort();
    };
  }, [enabled, ...dependencies]);

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
