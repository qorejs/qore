export interface StreamLifecycle<TValue> {
  isTerminated(): boolean;
  markTerminated(): boolean;
  setCleanup(cleanup: () => TValue | void): void;
  stop(finalizer: () => TValue, cleanup?: () => TValue | void): TValue;
}

export function createStreamLifecycle<TValue>({
  closeQueue,
  readCurrent
}: {
  closeQueue(): void;
  readCurrent(): TValue;
}): StreamLifecycle<TValue> {
  let terminated = false;
  let activeCleanup: () => TValue | void = readCurrent;

  return {
    isTerminated() {
      return terminated;
    },

    markTerminated() {
      if (terminated) {
        return false;
      }

      terminated = true;
      return true;
    },

    setCleanup(cleanup) {
      activeCleanup = cleanup;
    },

    stop(finalizer, cleanup = activeCleanup) {
      if (terminated) {
        return readCurrent();
      }

      terminated = true;
      cleanup();
      closeQueue();
      return finalizer();
    }
  };
}
