import { computed, signal } from './signal.js';
import type { ResponseReactiveState, ResponseStatus } from './response-types.js';

// Treat these states as closed so late writes cannot mutate a finished response.
export function isTerminalStatus(currentStatus: ResponseStatus): boolean {
  return currentStatus === 'completed' || currentStatus === 'error' || currentStatus === 'aborted';
}

// Create the reactive state bundle that powers a response lifecycle.
export function createResponseState<TChunk, TValue>(seed: TValue): ResponseReactiveState<TChunk, TValue> {
  const status = signal<ResponseStatus>('idle');
  const value = signal(seed);
  const error = signal<Error | null>(null);
  const chunks = signal<TChunk[]>([]);
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
  const chunkCount = computed(() => chunks().length);

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
