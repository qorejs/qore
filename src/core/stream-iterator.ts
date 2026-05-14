import type { AsyncQueue } from './stream-queue.js';
import type { QoreStream } from './stream-types.js';

export type IterableStream<TChunk, TValue> = QoreStream<TChunk, TValue> & {
  [Symbol.asyncIterator](): AsyncIterableIterator<TChunk>;
};

export function attachStreamIterator<TChunk, TValue>(
  readable: IterableStream<TChunk, TValue>,
  queue: AsyncQueue<TChunk>,
  shouldAbortOnReturn: () => boolean,
  abort: (reason?: unknown) => TValue
): void {
  readable[Symbol.asyncIterator] = async function*() {
    try {
      for await (const chunk of queue) {
        yield chunk;
      }
    } finally {
      if (shouldAbortOnReturn()) {
        abort('Stream consumer disposed');
      }
    }
  };
}
