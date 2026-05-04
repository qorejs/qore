// @ts-nocheck
import { toAsyncIterable } from './iterable.js';
import { createStream } from './stream-runtime.js';
import { reduceText } from './stream-state.js';
import { sleep } from '../shared/utils.js';

// Create a text-accumulating stream by default.
export function stream(sourceOrSetup, options = {}) {
  return createStream(sourceOrSetup, {
    seed: '',
    reduce: reduceText,
    ...options
  });
}

// Alias the generic constructor for advanced callers that provide custom reducers.
stream.create = createStream;

// Convenience constructor for explicit text streams.
stream.text = (sourceOrSetup, options = {}) => createStream(sourceOrSetup, {
  seed: '',
  reduce: reduceText,
  ...options
});

// Convenience constructor for streams that accumulate every chunk into an array.
stream.list = (sourceOrSetup, options = {}) => createStream(sourceOrSetup, {
  seed: [],
  reduce: (currentValue, chunk) => [...currentValue, chunk],
  ...options
});

// Convenience constructor for streams that only expose the latest chunk as current value.
stream.latest = (sourceOrSetup, options = {}) => createStream(sourceOrSetup, {
  seed: null,
  reduce: (_, chunk) => chunk,
  ...options
});

// Attach backpressure behavior without changing the reducer semantics.
stream.withBackpressure = (sourceOrSetup, backpressure, options = {}) => createStream(sourceOrSetup, {
  ...options,
  backpressure: typeof options.backpressure === 'object' && typeof backpressure === 'object'
    ? { ...options.backpressure, ...backpressure }
    : backpressure
});

// Shorthand for the first backpressure primitive: minimum interval between chunks.
stream.paced = (sourceOrSetup, interval, options = {}) => stream.withBackpressure(
  sourceOrSetup,
  { interval },
  options
);

// Turn any iterable or async iterable into a stream, optionally adding source delay.
export function from(source, options = {}) {
  const { delay = 0, ...streamOptions } = options;

  return createStream(async (controller) => {
    for await (const chunk of toAsyncIterable(source)) {
      if (controller.signal.aborted) {
        break;
      }

      if (delay > 0) {
        await sleep(delay, controller.signal);
      }

      await controller.push(chunk);
    }
  }, streamOptions);
}

// Map source chunks into a new stream while preserving stream semantics.
export function mapStream(source, mapper, options = {}) {
  return createStream(async (controller) => {
    let index = 0;

    for await (const chunk of toAsyncIterable(source)) {
      if (controller.signal.aborted) {
        break;
      }

      await controller.push(await mapper(chunk, index));
      index += 1;
    }
  }, options);
}

// Emit a running reduction so each chunk sees the accumulated state so far.
export function scanStream(source, reducer, seed, options = {}) {
  return createStream(async (controller) => {
    let index = 0;
    let current = seed;

    for await (const chunk of toAsyncIterable(source)) {
      if (controller.signal.aborted) {
        break;
      }

      current = await reducer(current, chunk, index);
      await controller.push(current);
      index += 1;
    }
  }, {
    seed,
    reduce: (_, chunk) => chunk,
    ...options
  });
}

// Re-export the iterable helper so integrations can normalize external sources.
export { createStream } from './stream-runtime.js';
export { toAsyncIterable } from './iterable.js';
