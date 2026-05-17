import { READ } from './signal-context.js';
import { computed, signal, type Signal } from './signal.js';
import type { Cleanup, SubscribeOptions } from './signal-types.js';
import type { ResponseReactiveState, ResponseStatus } from './response-types.js';

// Treat these states as closed so late writes cannot mutate a finished response.
export function isTerminalStatus(currentStatus: ResponseStatus): boolean {
  return currentStatus === 'completed' || currentStatus === 'error' || currentStatus === 'aborted';
}

interface ChunkSignal<T> extends Signal<T[]> {
  append(chunk: T): number;
  count(): number;
  peekCount(): number;
  snapshot(): T[];
}

function isChunkSignal<T>(value: Signal<T[]>): value is ChunkSignal<T> {
  return typeof (value as Partial<ChunkSignal<T>>).append === 'function'
    && typeof (value as Partial<ChunkSignal<T>>).count === 'function'
    && typeof (value as Partial<ChunkSignal<T>>).peekCount === 'function'
    && typeof (value as Partial<ChunkSignal<T>>).snapshot === 'function';
}

// Store the live chunk log behind a version signal so token commits do not copy
// the full history on every push. Public reads still receive defensive copies.
function createChunkSignal<T>(): ChunkSignal<T> {
  let items: T[] = [];
  const version = signal(0);

  const notify = () => version(version.peek() + 1);

  const chunks = ((nextValue = READ) => {
    if (nextValue === READ) {
      version();
      return [...items];
    }

    items = [...(nextValue as T[])];
    notify();
    return [...items];
  }) as ChunkSignal<T>;

  chunks.set = (nextValue) => {
    items = [...nextValue];
    notify();
    return [...items];
  };

  chunks.update = (updater) => chunks.set(updater([...items]));
  chunks.peek = () => [...items];
  chunks.subscribe = (listener, options: SubscribeOptions = {}): Cleanup => {
    const { immediate = true } = options;

    if (immediate) {
      listener([...items]);
    }

    return version.subscribe(() => listener([...items]), { immediate: false });
  };
  chunks.append = (chunk) => {
    const index = items.length;
    items.push(chunk);
    notify();
    return index;
  };
  chunks.count = () => {
    version();
    return items.length;
  };
  chunks.peekCount = () => items.length;
  chunks.snapshot = () => [...items];

  return chunks;
}

export function appendResponseChunk<T>(chunks: Signal<T[]>, chunk: T): number {
  if (isChunkSignal(chunks)) {
    return chunks.append(chunk);
  }

  const currentChunks = chunks.peek();
  const index = currentChunks.length;
  chunks([...currentChunks, chunk]);
  return index;
}

export function getResponseChunkCount<T>(chunks: Signal<T[]>): number {
  return isChunkSignal(chunks) ? chunks.peekCount() : chunks.peek().length;
}

export function snapshotResponseChunks<T>(chunks: Signal<T[]>): T[] {
  return isChunkSignal(chunks) ? chunks.snapshot() : [...chunks.peek()];
}

// Create the reactive state bundle that powers a response lifecycle.
export function createResponseState<TChunk, TValue>(seed: TValue): ResponseReactiveState<TChunk, TValue> {
  const status = signal<ResponseStatus>('idle');
  const value = signal(seed);
  const error = signal<Error | null>(null);
  const chunks = createChunkSignal<TChunk>();
  const startedAt = signal<number | null>(null);
  const finishedAt = signal<number | null>(null);

  const pending = computed(() => {
    const currentStatus = status();
    return currentStatus === 'pending' || currentStatus === 'streaming';
  });

  const streaming = computed(() => status() === 'streaming');
  const completed = computed(() => status() === 'completed');
  const failed = computed(() => status() === 'error');
  const aborted = computed(() => status() === 'aborted');
  const chunkCount = computed(() => chunks.count());

  return {
    status,
    value,
    error,
    chunks,
    startedAt,
    finishedAt,
    pending,
    streaming,
    completed,
    failed,
    aborted,
    chunkCount
  };
}
