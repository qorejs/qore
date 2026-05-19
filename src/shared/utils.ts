// Convert unknown thrown values into Error instances the runtime can reason about.
export function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  return new Error('Unknown Qore error');
}

// Convert abort reasons into stable Error instances for transport and runtime code.
export function normalizeAbortReason(reason: unknown, fallbackMessage = 'Operation aborted'): Error {
  if (reason == null) {
    return new Error(fallbackMessage);
  }

  return normalizeError(reason);
}

// Sleep for a fixed time and reject early if the surrounding operation is aborted.
export function sleep(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const onAbort = () => {
      cleanup();
      reject(normalizeAbortReason(signal?.reason, 'Operation aborted'));
    };

    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };

    if (signal?.aborted) {
      onAbort();
      return;
    }

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
