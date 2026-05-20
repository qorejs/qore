const encoder = new TextEncoder();

export interface PendingStreamBody {
  body: ReadableStream<Uint8Array>;
  cancelled: Promise<unknown>;
}

export interface SSEBodyOptions<TEvent> {
  doneFrame?: string | null;
  formatEvent?: (event: TEvent) => string;
}

function defaultFormatEvent<TEvent>(event: TEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export function createSSEBody<TEvent>(
  events: TEvent[],
  options: SSEBodyOptions<TEvent> = {}
): ReadableStream<Uint8Array> {
  const { doneFrame = 'data: [DONE]\n\n', formatEvent = defaultFormatEvent } = options;

  return new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(formatEvent(event)));
      }

      if (doneFrame) {
        controller.enqueue(encoder.encode(doneFrame));
      }

      controller.close();
    }
  });
}

export function createPendingSSEBody<TEvent>(
  events: TEvent[],
  options: SSEBodyOptions<TEvent> = {}
): PendingStreamBody {
  const { formatEvent = defaultFormatEvent } = options;
  let resolveCancelled!: (reason: unknown) => void;
  const cancelled = new Promise<unknown>((resolve) => {
    resolveCancelled = resolve;
  });

  return {
    body: new ReadableStream({
      start(controller) {
        for (const event of events) {
          controller.enqueue(encoder.encode(formatEvent(event)));
        }
      },
      cancel(reason) {
        resolveCancelled(reason);
      }
    }),
    cancelled
  };
}
