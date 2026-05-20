const encoder = new TextEncoder();

export interface PendingStreamBody {
  body: ReadableStream<Uint8Array>;
  cancelled: Promise<unknown>;
}

export function createLineBody(lines: unknown[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
      }

      controller.close();
    }
  });
}

export function createPendingLineBody(lines: unknown[]): PendingStreamBody {
  let resolveCancelled!: (reason: unknown) => void;
  const cancelled = new Promise<unknown>((resolve) => {
    resolveCancelled = resolve;
  });

  return {
    body: new ReadableStream({
      start(controller) {
        for (const line of lines) {
          controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
        }
      },
      cancel(reason) {
        resolveCancelled(reason);
      }
    }),
    cancelled
  };
}
