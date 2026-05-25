import { toAsyncIterable } from '../core/iterable.js';
import type { GlobalAbortSignal, MaybePromise, SourceLike } from '../core/response.js';
import { normalizeAbortReason, normalizeError } from '../shared/utils.js';

export interface SSEFrame<TChunk = unknown> {
  event?: string;
  id?: string;
  retry?: number;
  data: TChunk;
}

export interface CreateSSEResponseOptions<TChunk = unknown> {
  signal?: GlobalAbortSignal;
  headers?: Record<string, string>;
  event?: string;
  doneFrame?: string | false;
  encode?: (chunk: TChunk, index: number) => MaybePromise<SSEFrame<string> | string>;
  onError?: (error: Error) => MaybePromise<SSEFrame<string> | string | false>;
}

const encoder = new TextEncoder();

function normalizeFrame<TChunk>(
  chunk: TChunk,
  index: number,
  options: CreateSSEResponseOptions<TChunk>
): Promise<SSEFrame<string> | string> {
  if (typeof options.encode === 'function') {
    return Promise.resolve(options.encode(chunk, index));
  }

  return Promise.resolve({
    ...(options.event ? { event: options.event } : {}),
    data: typeof chunk === 'string' ? chunk : JSON.stringify(chunk)
  });
}

function formatSSEFrame(frame: SSEFrame<string> | string): string {
  if (typeof frame === 'string') {
    return frame.endsWith('\n\n') ? frame : `${frame}\n\n`;
  }

  const lines: string[] = [];

  if (frame.event) {
    lines.push(`event: ${frame.event}`);
  }

  if (frame.id) {
    lines.push(`id: ${frame.id}`);
  }

  if (typeof frame.retry === 'number') {
    lines.push(`retry: ${frame.retry}`);
  }

  const payloadLines = String(frame.data).split('\n');

  for (const line of payloadLines) {
    lines.push(`data: ${line}`);
  }

  return `${lines.join('\n')}\n\n`;
}

function mergeResponseHeaders(headers: Record<string, string> = {}): Headers {
  const merged = new Headers({
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'content-type': 'text/event-stream; charset=utf-8',
    ...headers
  });

  return merged;
}

export function createSSEResponse<TChunk>(
  source: SourceLike<TChunk>,
  options: CreateSSEResponseOptions<TChunk> = {}
): Response {
  const {
    signal,
    headers,
    doneFrame = 'data: [DONE]\n\n',
    onError = (error) => ({
      event: 'error',
      data: error.message
    })
  } = options;

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let index = 0;

      const close = () => {
        if (doneFrame) {
          controller.enqueue(encoder.encode(typeof doneFrame === 'string' ? doneFrame : 'data: [DONE]\n\n'));
        }

        controller.close();
      };

      if (signal?.aborted) {
        controller.error(normalizeAbortReason(signal.reason, 'SSE response aborted'));
        return;
      }

      const abortHandler = () => {
        try {
          controller.close();
        } catch {
          // Ignore close races after the stream has already settled.
        }
      };

      signal?.addEventListener('abort', abortHandler, { once: true });

      try {
        for await (const chunk of toAsyncIterable(source)) {
          if (signal?.aborted) {
            close();
            return;
          }

          const frame = await normalizeFrame(chunk, index, options);
          controller.enqueue(encoder.encode(formatSSEFrame(frame)));
          index += 1;
        }

        close();
      } catch (error) {
        if (signal?.aborted) {
          abortHandler();
          return;
        }

        const normalizedError = normalizeError(error);
        const errorFrame = await onError(normalizedError);

        if (errorFrame !== false) {
          controller.enqueue(encoder.encode(formatSSEFrame(errorFrame)));
        }

        controller.close();
      } finally {
        signal?.removeEventListener('abort', abortHandler);
      }
    }
  });

  return new Response(body, {
    status: 200,
    headers: mergeResponseHeaders(headers)
  });
}
