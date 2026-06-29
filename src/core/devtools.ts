import type { ResponseStatus } from './response.js';

export type QoreDevtoolsStreamPhase = 'create' | 'status' | 'chunk' | 'complete' | 'error' | 'abort';

export interface QoreDevtoolsStreamEvent<TChunk = unknown, TValue = unknown> {
  kind: 'stream';
  phase: QoreDevtoolsStreamPhase;
  id: string;
  name?: string;
  status?: ResponseStatus;
  chunk?: TChunk;
  value?: TValue;
  chunkCount?: number;
  error?: Error | null;
  timestamp: number;
}

export type QoreDevtoolsEvent = QoreDevtoolsStreamEvent;

export interface QoreDevtoolsHook {
  enabled?: boolean;
  events?: QoreDevtoolsEvent[];
  emit?(event: QoreDevtoolsEvent): void;
}

type QoreDevtoolsTarget = QoreDevtoolsHook | ((event: QoreDevtoolsEvent) => void) | undefined;

declare global {
  // This development-only hook is intentionally optional and inert unless an app installs it.
  // eslint-disable-next-line no-var
  var __QORE_DEVTOOLS__: QoreDevtoolsTarget;
}

let nextStreamId = 0;

export function createDevtoolsStreamId(): string {
  nextStreamId += 1;
  return `qore-stream-${nextStreamId}`;
}

export function emitQoreDevtoolsEvent(event: QoreDevtoolsEvent): void {
  const hook = globalThis.__QORE_DEVTOOLS__;

  if (!hook) {
    return;
  }

  try {
    if (typeof hook === 'function') {
      hook(event);
      return;
    }

    if (hook.enabled === false) {
      return;
    }

    hook.events?.push(event);
    hook.emit?.(event);
  } catch {
    // DevTools instrumentation must never affect application control flow.
  }
}
