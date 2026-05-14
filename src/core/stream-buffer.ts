import { createDeferred } from './stream-backpressure.js';
import type { Deferred, NormalizedBackpressure } from './stream-types.js';
import { sleep } from '../shared/utils.js';

interface BufferedWrite<TChunk, TValue> extends Deferred<TValue> {
  chunk: TChunk;
}

export interface StreamBuffer<TChunk, TValue> {
  push(chunk: TChunk): Promise<TValue>;
  flush(result?: TValue): TValue;
  flushScheduled(): Promise<void>;
}

export function createStreamBuffer<TChunk, TValue>({
  enqueueChunk,
  fail,
  isTerminated,
  pressure,
  readCurrent,
  recordDrop,
  signal,
  updateBuffered,
  writeChunk
}: {
  enqueueChunk(chunk: TChunk): void;
  fail(error: unknown): Error | TValue;
  isTerminated(): boolean;
  pressure: NormalizedBackpressure;
  readCurrent(): TValue;
  recordDrop(): void;
  signal: AbortSignal;
  updateBuffered(count: number): void;
  writeChunk(chunk: TChunk): TValue;
}): StreamBuffer<TChunk, TValue> {
  const pendingWrites: BufferedWrite<TChunk, TValue>[] = [];
  const spaceWaiters: Deferred<void>[] = [];
  const scheduledPushes = new Set<Promise<TValue>>();
  let scheduledPushError: unknown = null;
  let drainPromise: Promise<void> | null = null;
  let lastPushAt = 0;

  function releaseSpaceWaiters(): void {
    if (pressure.buffer === Infinity) {
      while (spaceWaiters.length > 0) {
        spaceWaiters.shift()?.resolve(undefined);
      }

      return;
    }

    while (spaceWaiters.length > 0 && pendingWrites.length < pressure.buffer) {
      spaceWaiters.shift()?.resolve(undefined);
    }
  }

  function flush(result: TValue = readCurrent()): TValue {
    while (pendingWrites.length > 0) {
      pendingWrites.shift()?.resolve(result);
    }

    updateBuffered(0);
    releaseSpaceWaiters();
    return result;
  }

  async function flushScheduled(): Promise<void> {
    while (scheduledPushes.size > 0) {
      await Promise.allSettled(Array.from(scheduledPushes));
    }

    if (scheduledPushError !== null) {
      throw scheduledPushError;
    }

    while (drainPromise) {
      await drainPromise;
    }

    if (scheduledPushError !== null) {
      throw scheduledPushError;
    }
  }

  async function waitForNextWindow(): Promise<void> {
    if (pressure.interval <= 0 || lastPushAt === 0) {
      return;
    }

    const remaining = pressure.interval - (Date.now() - lastPushAt);

    if (remaining > 0) {
      try {
        await sleep(remaining, signal);
      } catch (error) {
        if (!signal.aborted) {
          throw error;
        }
      }
    }
  }

  function scheduleDrain(): Promise<void> | null {
    if (drainPromise || isTerminated()) {
      return drainPromise;
    }

    drainPromise = (async () => {
      try {
        while (pendingWrites.length > 0 && !isTerminated() && !signal.aborted) {
          const entry = pendingWrites.shift() as BufferedWrite<TChunk, TValue>;
          updateBuffered(pendingWrites.length);
          releaseSpaceWaiters();

          await waitForNextWindow();

          if (isTerminated() || signal.aborted) {
            entry.resolve(readCurrent());
            continue;
          }

          enqueueChunk(entry.chunk);
          const nextValue = writeChunk(entry.chunk);
          lastPushAt = Date.now();
          entry.resolve(nextValue);
        }
      } finally {
        drainPromise = null;

        if (pendingWrites.length > 0 && !isTerminated() && !signal.aborted) {
          scheduleDrain();
        }
      }
    })();

    return drainPromise;
  }

  async function waitForBufferSpace(): Promise<boolean> {
    if (pressure.buffer === Infinity) {
      return true;
    }

    while (!isTerminated() && !signal.aborted && pendingWrites.length >= pressure.buffer) {
      const gate = createDeferred<void>();
      spaceWaiters.push(gate);
      await gate.promise;
    }

    return !isTerminated() && !signal.aborted;
  }

  async function push(chunk: TChunk): Promise<TValue> {
    if (isTerminated() || signal.aborted) {
      return readCurrent();
    }

    const writeTask = (async () => {
      if (pressure.overflow === 'wait') {
        const hasSpace = await waitForBufferSpace();

        if (!hasSpace) {
          return readCurrent();
        }
      } else if (pressure.buffer !== Infinity && pendingWrites.length >= pressure.buffer) {
        if (pressure.overflow === 'drop-oldest' && pendingWrites.length > 0) {
          const droppedWrite = pendingWrites.shift() as BufferedWrite<TChunk, TValue>;
          recordDrop();
          droppedWrite.resolve(readCurrent());
        } else if (pressure.overflow === 'drop-newest' || pressure.overflow === 'drop-oldest') {
          recordDrop();
          return readCurrent();
        } else if (pressure.overflow === 'error') {
          const overflowError = new Error('Qore stream backpressure buffer overflow');

          if (scheduledPushError === null) {
            scheduledPushError = overflowError;
          }

          fail(overflowError);
          return readCurrent();
        }
      }

      if (isTerminated() || signal.aborted) {
        return readCurrent();
      }

      const entry = createDeferred<TValue>() as BufferedWrite<TChunk, TValue>;
      entry.chunk = chunk;
      pendingWrites.push(entry);
      updateBuffered(pendingWrites.length);
      scheduleDrain();
      return entry.promise;
    })();

    scheduledPushes.add(writeTask);

    try {
      return await writeTask;
    } catch (error) {
      if (scheduledPushError === null) {
        scheduledPushError = error;
      }

      if (!isTerminated() && !signal.aborted) {
        fail(error);
      }

      return readCurrent();
    } finally {
      scheduledPushes.delete(writeTask);
    }
  }

  return {
    flush,
    flushScheduled,
    push
  };
}
