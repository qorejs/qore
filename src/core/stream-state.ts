import type { ReadonlySignal } from './signal.js';

// Expose a response value as a read-only signal surface.
export function createReadableSignal<T>(sourceSignal: ReadonlySignal<T>): ReadonlySignal<T> {
  const read = (() => sourceSignal()) as ReadonlySignal<T>;

  read.peek = () => sourceSignal.peek();
  read.subscribe = (listener, options) => sourceSignal.subscribe(listener, options);

  return read;
}

// Text streams concatenate chunks by default so they can drive text nodes directly.
export function reduceText(currentValue: string, chunk: unknown): string {
  return currentValue + String(chunk ?? '');
}
