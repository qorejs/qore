// @ts-nocheck
import { computed, signal } from './signal.js';

// Treat these states as closed so late writes cannot mutate a finished response.
export function isTerminalStatus(currentStatus) {
  return currentStatus === 'completed' || currentStatus === 'error' || currentStatus === 'aborted';
}

// Create the reactive state bundle that powers a response lifecycle.
export function createResponseState(seed) {
  const status = signal('idle');
  const value = signal(seed);
  const error = signal(null);
  const chunks = signal([]);
  const startedAt = signal(null);
  const finishedAt = signal(null);

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
