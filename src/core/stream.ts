import { toAsyncIterable } from './iterable.js';
import { createStream } from './stream-runtime.js';
import { reduceText } from './stream-state.js';
import type { MaybePromise, SourceLike } from './response.js';
import type { BackpressureOptions, QoreStream, StreamFactory, StreamInput, StreamOptions } from './stream-types.js';
import { sleep } from '../shared/utils.js';

const streamFactory = (<TChunk = unknown>(
  sourceOrSetup: StreamInput<TChunk, string>,
  options: StreamOptions<TChunk, string> = {}
): QoreStream<TChunk, string> => createStream(sourceOrSetup, {
  seed: '',
  reduce: reduceText,
  ...options
})) as StreamFactory;

// Alias the generic constructor for advanced callers that provide custom reducers.
streamFactory.create = createStream;

// Convenience constructor for explicit text streams.
streamFactory.text = <TChunk = unknown>(
  sourceOrSetup: StreamInput<TChunk, string>,
  options: StreamOptions<TChunk, string> = {}
): QoreStream<TChunk, string> => createStream(sourceOrSetup, {
  seed: '',
  reduce: reduceText,
  ...options
});

// Convenience constructor for streams that accumulate every chunk into an array.
streamFactory.list = <TChunk>(
  sourceOrSetup: StreamInput<TChunk, TChunk[]>,
  options: StreamOptions<TChunk, TChunk[]> = {}
): QoreStream<TChunk, TChunk[]> => createStream(sourceOrSetup, {
  seed: [],
  reduce: (currentValue, chunk) => [...currentValue, chunk],
  ...options
});

// Convenience constructor for streams that only expose the latest chunk as current value.
streamFactory.latest = <TChunk>(
  sourceOrSetup: StreamInput<TChunk, TChunk | null>,
  options: StreamOptions<TChunk, TChunk | null> = {}
): QoreStream<TChunk, TChunk | null> => createStream(sourceOrSetup, {
  seed: null,
  reduce: (_, chunk) => chunk,
  ...options
});

// Attach backpressure behavior without changing the reducer semantics.
streamFactory.withBackpressure = <TChunk = unknown, TValue = string>(
  sourceOrSetup: StreamInput<TChunk, TValue>,
  backpressure: number | BackpressureOptions,
  options: StreamOptions<TChunk, TValue> = {}
): QoreStream<TChunk, TValue> => createStream(sourceOrSetup, {
  ...options,
  backpressure: typeof options.backpressure === 'object' && options.backpressure !== null && typeof backpressure === 'object'
    ? { ...options.backpressure, ...backpressure }
    : backpressure
});

// Shorthand for the first backpressure primitive: minimum interval between chunks.
streamFactory.paced = <TChunk = unknown, TValue = string>(
  sourceOrSetup: StreamInput<TChunk, TValue>,
  interval: number,
  options: StreamOptions<TChunk, TValue> = {}
): QoreStream<TChunk, TValue> => streamFactory.withBackpressure(
  sourceOrSetup,
  { interval },
  options
);

// Create a text-accumulating stream by default.
export const stream = streamFactory;

// Turn any iterable or async iterable into a stream, optionally adding source delay.
export function from<TChunk, TValue = string>(
  source: SourceLike<TChunk>,
  options: StreamOptions<TChunk, TValue> & { delay?: number } = {}
): QoreStream<TChunk, TValue> {
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
export function mapStream<TInput, TOutput, TValue = string>(
  source: SourceLike<TInput>,
  mapper: (chunk: TInput, index: number) => MaybePromise<TOutput>,
  options: StreamOptions<TOutput, TValue> = {}
): QoreStream<TOutput, TValue> {
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
export function scanStream<TInput, TOutput>(
  source: SourceLike<TInput>,
  reducer: (currentValue: TOutput, chunk: TInput, index: number) => MaybePromise<TOutput>,
  seed: TOutput,
  options: Omit<StreamOptions<TOutput, TOutput>, 'seed' | 'reduce'> = {}
): QoreStream<TOutput, TOutput> {
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
export type {
  BackpressureOptions,
  QoreStream,
  StreamController,
  StreamFactory,
  StreamInput,
  StreamOptions,
  StreamSetup
} from './stream-types.js';
export { toAsyncIterable } from './iterable.js';
