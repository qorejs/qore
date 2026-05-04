// @ts-nocheck
// Expose a response value as a read-only signal surface.
export function createReadableSignal(sourceSignal) {
  const read = () => sourceSignal();

  read.peek = () => sourceSignal.peek();
  read.subscribe = (listener, options) => sourceSignal.subscribe(listener, options);

  return read;
}

// Text streams concatenate chunks by default so they can drive text nodes directly.
export function reduceText(currentValue, chunk) {
  return currentValue + String(chunk ?? '');
}
