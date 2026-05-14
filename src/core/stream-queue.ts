import { normalizeError } from '../shared/utils.js';

interface QueueWaiter<T> {
  resolve(result: IteratorResult<T>): void;
  reject(reason?: unknown): void;
}

// Bridge producer pushes and async iteration with a minimal internal queue.
export class AsyncQueue<T> implements AsyncIterableIterator<T> {
  values: T[] = [];
  waiters: QueueWaiter<T>[] = [];
  closed = false;
  error: Error | null = null;

  push(value: T): void {
    if (this.closed) {
      return;
    }

    const waiter = this.waiters.shift();

    if (waiter) {
      waiter.resolve({ value, done: false });
      return;
    }

    this.values.push(value);
  }

  close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;

    while (this.waiters.length > 0) {
      const waiter = this.waiters.shift();
      waiter?.resolve({ value: undefined, done: true });
    }
  }

  fail(error: unknown): void {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.error = normalizeError(error);

    while (this.waiters.length > 0) {
      const waiter = this.waiters.shift();
      waiter?.reject(this.error);
    }
  }

  next(): Promise<IteratorResult<T>> {
    if (this.values.length > 0) {
      const value = this.values.shift() as T;
      return Promise.resolve({ value, done: false });
    }

    if (this.closed) {
      if (this.error) {
        return Promise.reject(this.error);
      }

      return Promise.resolve({ value: undefined, done: true });
    }

    return new Promise<IteratorResult<T>>((resolve, reject) => {
      this.waiters.push({ resolve, reject });
    });
  }

  return(): Promise<IteratorResult<T>> {
    this.close();
    return Promise.resolve({ value: undefined, done: true });
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<T> {
    return this;
  }
}
