// Normalize values, iterables, and async iterables into one async iterable shape.
export function toAsyncIterable<T>(source: T | Iterable<T> | AsyncIterable<T> | null | undefined): AsyncIterable<T> {
  if (source == null) {
    return (async function* empty() {})();
  }

  if (typeof (source as AsyncIterable<T>)[Symbol.asyncIterator] === 'function') {
    return source as AsyncIterable<T>;
  }

  if (typeof (source as Iterable<T>)[Symbol.iterator] === 'function') {
    return (async function* fromIterable() {
      yield* source as Iterable<T>;
    })();
  }

  return (async function* fromValue() {
    yield source as T;
  })();
}
