import { normalizeAbortReason } from '../shared/utils.js';
import type { LineEvent } from './types.js';

// Read newline-delimited streaming bodies without depending on a provider SDK.
export async function* readLines(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal | null
): AsyncIterable<LineEvent<string>> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let lineNumber = 0;
  const abortMessage = 'Line stream aborted';

  const cancelReader = () => {
    void reader.cancel(signal?.reason).catch(() => {
      // Ignore reader cancellation races during abort handling.
    });
  };

  const flushLines = function* (lines: string[]): Iterable<LineEvent<string>> {
    for (const line of lines) {
      if (!line) {
        continue;
      }

      lineNumber += 1;
      yield {
        line: lineNumber,
        raw: line,
        data: line
      };
    }
  };

  if (signal?.aborted) {
    cancelReader();
    throw normalizeAbortReason(signal.reason, abortMessage);
  }

  signal?.addEventListener('abort', cancelReader, { once: true });

  try {
    while (true) {
      if (signal?.aborted) {
        throw normalizeAbortReason(signal.reason, abortMessage);
      }

      let chunk;

      try {
        chunk = await reader.read();
      } catch (error) {
        if (signal?.aborted) {
          throw normalizeAbortReason(signal.reason, abortMessage);
        }

        throw error;
      }

      const { value, done } = chunk;
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';

      for (const event of flushLines(lines)) {
        yield event;
      }

      if (done) {
        if (signal?.aborted) {
          throw normalizeAbortReason(signal.reason, abortMessage);
        }

        break;
      }
    }

    if (signal?.aborted) {
      throw normalizeAbortReason(signal.reason, abortMessage);
    }

    if (buffer) {
      lineNumber += 1;
      yield {
        line: lineNumber,
        raw: buffer,
        data: buffer
      };
    }
  } finally {
    signal?.removeEventListener('abort', cancelReader);
  }
}

// Default to JSON payloads when possible, otherwise preserve the raw line text.
export function parseLineData(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    return line;
  }
}

// Surface provider-side error payloads from NDJSON-style streams.
export function isLineError(event: LineEvent<unknown>): boolean {
  return Boolean(
    event.data
    && typeof event.data === 'object'
    && 'error' in event.data
    && (typeof event.data.error === 'string' || Boolean(event.data.error))
  );
}

// Pull a readable message from the common line-stream error shapes.
export function getLineErrorMessage(event: LineEvent<unknown>, name: string): string {
  if (event.data && typeof event.data === 'object') {
    const errorRecord = event.data as {
      error?: { message?: string } | string;
      message?: string;
    };

    if (typeof errorRecord.error === 'string') {
      return errorRecord.error;
    }

    return errorRecord.error?.message ?? errorRecord.message ?? `${name} streaming error`;
  }

  return `${name} streaming error`;
}
