import type { ReadonlySignal } from './signal.js';

// Expose a response value as a read-only signal surface.
export function createReadableSignal<T>(sourceSignal: ReadonlySignal<T>): ReadonlySignal<T> {
  const read = (() => sourceSignal()) as ReadonlySignal<T>;

  read.peek = () => sourceSignal.peek();
  read.subscribe = (listener, options) => sourceSignal.subscribe(listener, options);

  return read;
}

// Arrays are copied at the public stream boundary so readers cannot mutate internal chunk state.
export function createReadableArraySignal<T>(sourceSignal: ReadonlySignal<T[]>): ReadonlySignal<T[]> {
  const read = (() => [...sourceSignal()]) as ReadonlySignal<T[]>;

  read.peek = () => [...sourceSignal.peek()];
  read.subscribe = (listener, options) => sourceSignal.subscribe((value) => {
    listener([...value]);
  }, options);

  return read;
}

// Text streams concatenate chunks by default so they can drive text nodes directly.
export function reduceText(currentValue: string, chunk: unknown): string {
  return currentValue + String(chunk ?? '');
}
