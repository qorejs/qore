// @ts-nocheck
import { normalizeError } from '../shared/utils.js';

// Bridge producer pushes and async iteration with a minimal internal queue.
export class AsyncQueue {
  constructor() {
    this.values = [];
    this.waiters = [];
    this.closed = false;
    this.error = null;
  }

  push(value) {
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

  close() {
    if (this.closed) {
      return;
    }

    this.closed = true;

    while (this.waiters.length > 0) {
      const waiter = this.waiters.shift();
      waiter.resolve({ value: undefined, done: true });
    }
  }

  fail(error) {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.error = normalizeError(error);

    while (this.waiters.length > 0) {
      const waiter = this.waiters.shift();
      waiter.reject(this.error);
    }
  }

  next() {
    if (this.values.length > 0) {
      return Promise.resolve({ value: this.values.shift(), done: false });
    }

    if (this.closed) {
      if (this.error) {
        return Promise.reject(this.error);
      }

      return Promise.resolve({ value: undefined, done: true });
    }

    return new Promise((resolve, reject) => {
      this.waiters.push({ resolve, reject });
    });
  }

  return() {
    this.close();
    return Promise.resolve({ value: undefined, done: true });
  }

  [Symbol.asyncIterator]() {
    return this;
  }
}
