import type { SSEEvent } from './types.js';

// Parse server-sent events without adding any transport dependency.
export async function* readSSE(body: ReadableStream<Uint8Array>): AsyncIterable<SSEEvent<string>> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventName = 'message';
  let eventId: string | null = null;
  let retry: number | null = null;
  let data: string[] = [];

  const flushEvent = (): SSEEvent<string> | null => {
    if (data.length === 0) {
      eventName = 'message';
      eventId = null;
      retry = null;
      return null;
    }

    const nextEvent = {
      event: eventName,
      id: eventId,
      retry,
      data: data.join('\n')
    };

    eventName = 'message';
    eventId = null;
    retry = null;
    data = [];

    return nextEvent;
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line) {
        const nextEvent = flushEvent();

        if (nextEvent) {
          yield nextEvent;
        }

        continue;
      }

      if (line.startsWith(':')) {
        continue;
      }

      const separator = line.indexOf(':');
      const field = separator === -1 ? line : line.slice(0, separator);
      const rawValue = separator === -1 ? '' : line.slice(separator + 1).replace(/^ /, '');

      switch (field) {
        case 'event':
          eventName = rawValue || 'message';
          break;
        case 'data':
          data.push(rawValue);
          break;
        case 'id':
          eventId = rawValue;
          break;
        case 'retry': {
          const parsedRetry = Number.parseInt(rawValue, 10);
          retry = Number.isNaN(parsedRetry) ? null : parsedRetry;
          break;
        }
        default:
          break;
      }
    }

    if (done) {
      break;
    }
  }

  const finalEvent = flushEvent();

  if (finalEvent) {
    yield finalEvent;
  }
}

// Default to JSON payloads when possible, otherwise preserve the raw text event body.
export function parseEventData(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

// Surface provider-side SSE error objects through one shared fallback.
export function isErrorEvent(event: SSEEvent<unknown>): boolean {
  return Boolean(
    event.data
    && typeof event.data === 'object'
    && 'type' in event.data
    && event.data.type === 'error'
  );
}

// Pull a human-readable message from common SSE error shapes.
export function getErrorMessage(event: SSEEvent<unknown>, name: string): string {
  if (event.data && typeof event.data === 'object') {
    const errorRecord = event.data as {
      error?: { message?: string };
      message?: string;
    };

    return errorRecord.error?.message ?? errorRecord.message ?? `${name} streaming error`;
  }

  return `${name} streaming error`;
}
