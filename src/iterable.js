export function toAsyncIterable(source) {
  if (source == null) {
    return (async function* empty() {})();
  }

  if (typeof source[Symbol.asyncIterator] === 'function') {
    return source;
  }

  if (typeof source[Symbol.iterator] === 'function') {
    return (async function* fromIterable() {
      yield* source;
    })();
  }

  return (async function* fromValue() {
    yield source;
  })();
}
