import type { ResponseState, ResponseStatus } from '../core/response.js';
import type { ResponseRenderState, ResponseViews } from './types.js';

// Read a response into one plain object so templates can branch on status cleanly.
export function readResponseState<TChunk, TValue>(
  responseState: ResponseState<TChunk, TValue>
): ResponseRenderState<TChunk, TValue> {
  return {
    response: responseState,
    status: responseState.status(),
    value: responseState.value(),
    error: responseState.error(),
    chunks: responseState.chunks(),
    startedAt: responseState.startedAt(),
    finishedAt: responseState.finishedAt(),
    pending: responseState.pending(),
    streaming: responseState.streaming(),
    completed: responseState.completed(),
    failed: responseState.failed(),
    aborted: responseState.aborted(),
    chunkCount: responseState.chunkCount()
  };
}

// Pick the best matching view override for the current response lifecycle state.
export function pickResponseTemplate<TChunk, TValue>(
  status: ResponseStatus,
  views: ResponseViews<TChunk, TValue>
) {
  switch (status) {
    case 'idle':
      return views.idle ?? views.pending ?? views.default;
    case 'pending':
      return views.pending ?? views.default;
    case 'streaming':
      return views.streaming ?? views.pending ?? views.default;
    case 'completed':
      return views.completed ?? views.default;
    case 'error':
      return views.error ?? views.default;
    case 'aborted':
      return views.aborted ?? views.default;
    default:
      return views.default;
  }
}
