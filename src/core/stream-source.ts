import { toAsyncIterable } from './iterable.js';
import type { SourceLike } from './response.js';
import type { StreamController, StreamInput, StreamSetup } from './stream-types.js';

// Distinguish a setup callback from callable stream or signal-like values.
function isSetupFunction<TChunk, TValue>(
  sourceOrSetup: StreamInput<TChunk, TValue>
): sourceOrSetup is StreamSetup<TChunk, TValue> {
  return typeof sourceOrSetup === 'function'
    && typeof sourceOrSetup[Symbol.asyncIterator] !== 'function'
    && typeof (sourceOrSetup as { peek?: unknown }).peek !== 'function';
}

// Pipe any async iterable-like source into the controller, honoring aborts and pacing.
async function pipeSource<TChunk, TValue>(
  source: SourceLike<TChunk>,
  controller: StreamController<TChunk, TValue>
): Promise<void> {
  for await (const chunk of toAsyncIterable(source)) {
    if (controller.signal.aborted) {
      break;
    }

    await controller.push(chunk);
  }
}

// Accept either a setup callback or a pre-existing iterable source.
export async function startSource<TChunk, TValue>(
  sourceOrSetup: StreamInput<TChunk, TValue>,
  controller: StreamController<TChunk, TValue>
): Promise<void> {
  if (isSetupFunction(sourceOrSetup)) {
    const maybeSource = await sourceOrSetup(controller);

    if (maybeSource !== undefined) {
      await pipeSource(maybeSource as SourceLike<TChunk>, controller);
    }

    return;
  }

  await pipeSource(sourceOrSetup, controller);
}
