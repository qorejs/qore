import { toAsyncIterable } from './iterable.js';
import { createStream } from './stream-runtime.js';
import { startSource } from './stream-source.js';
import { reduceText } from './stream-state.js';
import type { MaybePromise, SourceLike } from './response.js';
import type {
  BackpressureOptions,
  QoreEventStream,
  QoreStream,
  RetryBackoff,
  RetryableStreamOptions,
  StreamEventBase,
  StreamEventOf,
  StreamEventOptions,
  StreamEventType,
  StreamFactory,
  StreamInput,
  StreamPipeStage,
  StreamSelectOptions,
  StreamOptions
} from './stream-types.js';
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

streamFactory.events = <TEvent extends StreamEventBase>(
  sourceOrSetup: StreamInput<TEvent, TEvent[]>,
  options: StreamEventOptions<TEvent> = {}
): QoreEventStream<TEvent> => attachEventSelectors(createStream(sourceOrSetup, {
  seed: [] as TEvent[],
  reduce: (currentValue, chunk) => [...currentValue, chunk],
  ...options
}));

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

streamFactory.merge = <TChunk = unknown, TValue = string>(
  sources: Array<SourceLike<TChunk>>,
  options: StreamOptions<TChunk, TValue> = {}
): QoreStream<TChunk, TValue> => createStream(async (controller) => {
  await Promise.all(sources.map(async (source) => {
    await startSource(source, controller);
  }));
}, options);

streamFactory.concat = <TChunk = unknown, TValue = string>(
  sources: Array<SourceLike<TChunk>>,
  options: StreamOptions<TChunk, TValue> = {}
): QoreStream<TChunk, TValue> => createStream(async (controller) => {
  for (const source of sources) {
    if (controller.signal.aborted) {
      break;
    }

    await startSource(source, controller);
  }
}, options);

streamFactory.pipe = <TChunk = unknown, TValue = string>(
  sourceOrSetup: StreamInput<TChunk, TValue>,
  stages: Array<StreamPipeStage<TChunk, TValue>>,
  options: StreamOptions<TChunk, TValue> = {}
): QoreStream<TChunk, TValue> => createStream(async (controller) => {
  const consumeSource = async (currentSource: StreamInput<TChunk, TValue>): Promise<TValue> => {
    const currentStream = createStream(currentSource, options);

    for await (const chunk of currentStream) {
      if (controller.signal.aborted) {
        break;
      }

      await controller.push(chunk);
    }

    return currentStream.ready;
  };

  let currentValue = await consumeSource(sourceOrSetup);

  for (const [index, stage] of stages.entries()) {
    if (controller.signal.aborted) {
      break;
    }

    const nextSource = await stage(currentValue, index);
    currentValue = await consumeSource(nextSource);
  }
}, options);

streamFactory.race = <TChunk = unknown, TValue = string>(
  sources: Array<SourceLike<TChunk>>,
  options: StreamOptions<TChunk, TValue> = {}
): QoreStream<TChunk, TValue> => createStream(async (controller) => {
  const activeIterators = sources.map((source, index) => ({
    index,
    iterator: toAsyncIterable(source)[Symbol.asyncIterator]()
  }));

  let winner: AsyncIterator<TChunk> | null = null;

  try {
    while (!controller.signal.aborted && winner === null && activeIterators.length > 0) {
      const nextResult = await Promise.race(activeIterators.map(async ({ index, iterator }) => ({
        index,
        result: await iterator.next()
      })));

      if (nextResult.result.done) {
        const exhaustedIndex = activeIterators.findIndex(({ index }) => index === nextResult.index);

        if (exhaustedIndex >= 0) {
          activeIterators.splice(exhaustedIndex, 1);
        }

        continue;
      }

      winner = activeIterators.find(({ index }) => index === nextResult.index)?.iterator ?? null;
      await controller.push(nextResult.result.value);
    }

    if (!winner || controller.signal.aborted) {
      return;
    }

    for (const candidate of activeIterators) {
      if (candidate.iterator !== winner) {
        await candidate.iterator.return?.();
      }
    }

    while (!controller.signal.aborted) {
      const nextChunk = await winner.next();

      if (nextChunk.done) {
        break;
      }

      await controller.push(nextChunk.value);
    }
  } finally {
    for (const { iterator } of activeIterators) {
      if (iterator !== winner) {
        await iterator.return?.();
      }
    }
  }
}, options);

streamFactory.retryable = <TChunk = unknown, TValue = string>(
  sourceFactory: (attempt: number) => StreamInput<TChunk, TValue>,
  options: RetryableStreamOptions<TChunk, TValue> = {}
): QoreStream<TChunk, TValue> => {
  const {
    maxRetries = 0,
    backoff = 'exponential',
    ...streamOptions
  } = options;

  return createStream(async (controller) => {
    let retries = 0;

    while (!controller.signal.aborted) {
      try {
        await startSource(sourceFactory(retries), controller);
        return;
      } catch (error) {
        if (retries >= maxRetries || controller.signal.aborted) {
          throw error;
        }

        retries += 1;
        const delay = await resolveRetryDelay(backoff, retries, error);

        if (delay > 0) {
          await sleep(delay, controller.signal);
        }
      }
    }
  }, streamOptions);
};

streamFactory.switchMap = <TInput, TChunk = unknown, TValue = string>(
  source: SourceLike<TInput>,
  mapper: (value: TInput, index: number) => MaybePromise<SourceLike<TChunk>>,
  options: StreamOptions<TChunk, TValue> = {}
): QoreStream<TChunk, TValue> => createStream(async (controller) => {
  let index = 0;
  let activeToken = 0;
  let activeTask: Promise<void> | null = null;

  const startInner = (token: number, innerSource: SourceLike<TChunk>) => (async () => {
    for await (const chunk of toAsyncIterable(innerSource)) {
      if (controller.signal.aborted || token !== activeToken) {
        break;
      }

      await controller.push(chunk);
    }
  })().catch((error) => {
    if (token !== activeToken || controller.signal.aborted) {
      return;
    }

    throw error;
  });

  for await (const value of toAsyncIterable(source)) {
    if (controller.signal.aborted) {
      break;
    }

    activeToken += 1;
    const token = activeToken;
    const innerSource = await mapper(value, index);
    activeTask = startInner(token, innerSource);
    index += 1;
  }

  await activeTask;
}, options);

streamFactory.from = from;

// Create a text-accumulating stream by default.
export const stream = streamFactory;

function attachEventSelectors<TEvent extends StreamEventBase>(
  events: QoreStream<TEvent, TEvent[]>
): QoreEventStream<TEvent> {
  const eventStream = events as QoreEventStream<TEvent>;

  eventStream.select = function select<TType extends StreamEventType<TEvent>, TValue>(
    type: TType,
    options?: StreamSelectOptions<StreamEventOf<TEvent, TType>, TValue>
  ): QoreStream<StreamEventOf<TEvent, TType>, TValue | Array<StreamEventOf<TEvent, TType>>> {
    type SelectedEvent = StreamEventOf<TEvent, TType>;

    let seen = 0;
    let drain = Promise.resolve();

    const selectedOptions = options ?? {
      seed: [] as SelectedEvent[],
      reduce: (currentValue: SelectedEvent[], chunk: SelectedEvent) => [...currentValue, chunk]
    };

    return createStream<SelectedEvent, TValue | SelectedEvent[]>(async (controller) => {
      const emitFrom = async (chunks: TEvent[]): Promise<void> => {
        while (seen < chunks.length && !controller.signal.aborted) {
          const event = chunks[seen];
          seen += 1;

          if (event?.type === type) {
            await controller.push(event as SelectedEvent);
          }
        }
      };

      const queueDrain = (chunks: TEvent[]): void => {
        drain = drain
          .then(() => emitFrom(chunks))
          .catch((error: unknown) => {
            controller.fail(error);
          });
      };

      queueDrain(events.chunks.peek());
      const unsubscribe = events.chunks.subscribe(queueDrain, { immediate: false });

      try {
        await events.ready;
        await drain;
      } finally {
        unsubscribe();
      }
    }, selectedOptions as StreamOptions<SelectedEvent, TValue | SelectedEvent[]>);
  };

  return eventStream;
}

async function resolveRetryDelay(backoff: RetryBackoff, retry: number, error: unknown): Promise<number> {
  if (typeof backoff === 'function') {
    return Math.max(0, await backoff(retry, error));
  }

  if (Array.isArray(backoff)) {
    const nextDelay = backoff[Math.min(retry - 1, backoff.length - 1)] ?? 0;
    return Math.max(0, nextDelay);
  }

  if (backoff === 'exponential') {
    return 250 * 2 ** (retry - 1);
  }

  return Math.max(0, backoff);
}

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
  QoreEventStream,
  QoreStream,
  RetryBackoff,
  RetryableStreamOptions,
  StreamController,
  StreamEventBase,
  StreamEventOf,
  StreamEventOptions,
  StreamEventType,
  StreamFactory,
  StreamInput,
  StreamOptions,
  StreamSelectOptions,
  StreamSetup
} from './stream-types.js';
export { toAsyncIterable } from './iterable.js';
