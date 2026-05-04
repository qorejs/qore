// @ts-nocheck
import { toAsyncIterable } from './iterable.js';

// Distinguish a setup callback from callable stream or signal-like values.
function isSetupFunction(sourceOrSetup) {
  return typeof sourceOrSetup === 'function'
    && typeof sourceOrSetup[Symbol.asyncIterator] !== 'function'
    && typeof sourceOrSetup.peek !== 'function';
}

// Pipe any async iterable-like source into the controller, honoring aborts and pacing.
async function pipeSource(source, controller) {
  for await (const chunk of toAsyncIterable(source)) {
    if (controller.signal.aborted) {
      break;
    }

    await controller.push(chunk);
  }
}

// Accept either a setup callback or a pre-existing iterable source.
export async function startSource(sourceOrSetup, controller) {
  if (isSetupFunction(sourceOrSetup)) {
    const maybeSource = await sourceOrSetup(controller);

    if (maybeSource !== undefined) {
      await pipeSource(maybeSource, controller);
    }

    return;
  }

  await pipeSource(sourceOrSetup, controller);
}
