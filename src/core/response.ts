import { createResponse } from './response-runtime.js';
import type { CreateResponseOptions, ResponseFactory, ResponseState } from './response-types.js';

// Ship a few common reducers as convenience constructors on top of createResponse.
export { createResponse } from './response-runtime.js';
export type {
  CreateResponseOptions,
  GlobalAbortSignal,
  MaybePromise,
  ResponseConsumeContext,
  ResponseExecutorContext,
  ResponseFactory,
  ResponseReactiveState,
  ResponseRunOptions,
  ResponseSnapshot,
  ResponseSource,
  ResponseSourceFactory,
  ResponseState,
  ResponseStatus,
  SourceLike
} from './response-types.js';

export const response: ResponseFactory = {
  create<TChunk, TValue>(options: CreateResponseOptions<TChunk, TValue>): ResponseState<TChunk, TValue> {
    return createResponse(options);
  },

  text<TChunk = string>(seed = ''): ResponseState<TChunk, string> {
    return createResponse<TChunk, string>({
      seed,
      reduce: (currentValue, chunk) => currentValue + String(chunk)
    });
  },

  list<TChunk>(seed: TChunk[] = []): ResponseState<TChunk, TChunk[]> {
    return createResponse<TChunk, TChunk[]>({
      seed,
      reduce: (currentValue, chunk) => [...currentValue, chunk]
    });
  },

  latest<TChunk>(seed: TChunk | null = null): ResponseState<TChunk, TChunk | null> {
    return createResponse<TChunk, TChunk | null>({
      seed,
      reduce: (_, chunk) => chunk
    });
  }
};
