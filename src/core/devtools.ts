import type { ResponseStatus } from './response.js';
import { computed, signal, type ComputedSignal, type ReadonlySignal } from './signal.js';

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

export interface QoreInspectedStream<TValue = unknown> {
  id: string;
  name?: string;
  status?: ResponseStatus;
  value?: TValue;
  chunkCount: number;
  createdAt: number;
  updatedAt: number;
  firstChunkAt?: number;
  finishedAt?: number;
  durationMs?: number;
  firstChunkLatencyMs?: number;
  chunksPerSecond?: number;
  terminal: boolean;
  error?: Error | null;
}

export interface StreamInspectorOptions {
  maxEvents?: number;
  capturePayloads?: boolean;
}

export interface QoreStreamInspector {
  events: ReadonlySignal<readonly QoreDevtoolsEvent[]>;
  streams: ReadonlySignal<readonly QoreInspectedStream[]>;
  stream(idOrName: string): ReadonlySignal<QoreInspectedStream | undefined>;
  clear(): void;
  dispose(): void;
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

export function createStreamInspector(options: StreamInspectorOptions = {}): QoreStreamInspector {
  const { maxEvents = 500, capturePayloads = true } = options;
  const previousHook = globalThis.__QORE_DEVTOOLS__;
  const recordedEvents = signal<readonly QoreDevtoolsEvent[]>([]);
  const streamSelectors = new Map<string, ComputedSignal<QoreInspectedStream | undefined>>();

  function record(event: QoreDevtoolsEvent): void {
    const nextEvent = capturePayloads ? event : withoutPayload(event);

    recordedEvents.update((currentEvents) => {
      const nextEvents = [...currentEvents, nextEvent];
      return nextEvents.length > maxEvents ? nextEvents.slice(nextEvents.length - maxEvents) : nextEvents;
    });

    forwardDevtoolsEvent(previousHook, event);
  }

  globalThis.__QORE_DEVTOOLS__ = record;

  const inspectedStreams = computed<readonly QoreInspectedStream[]>(() => {
    const byId = new Map<string, QoreInspectedStream>();

    for (const event of recordedEvents()) {
      if (event.kind !== 'stream') {
        continue;
      }

      const previous = byId.get(event.id);
      const createdAt = previous?.createdAt ?? event.timestamp;
      const updatedAt = event.timestamp;
      const chunkCount = event.chunkCount ?? previous?.chunkCount ?? 0;
      const terminal = previous?.terminal === true || isTerminalPhase(event.phase);
      const nextStreamInput: InspectedStreamInput = {
        id: event.id,
        chunkCount,
        createdAt,
        updatedAt,
        terminal
      };

      const name = event.name ?? previous?.name;
      const status = event.status ?? previous?.status;
      const value = event.value ?? previous?.value;
      const firstChunkAt = event.phase === 'chunk'
        ? previous?.firstChunkAt ?? event.timestamp
        : previous?.firstChunkAt;
      const finishedAt = isTerminalPhase(event.phase) ? event.timestamp : previous?.finishedAt;
      const error = event.error ?? previous?.error;

      if (name !== undefined) {
        nextStreamInput.name = name;
      }

      if (status !== undefined) {
        nextStreamInput.status = status;
      }

      if (value !== undefined) {
        nextStreamInput.value = value;
      }

      if (firstChunkAt !== undefined) {
        nextStreamInput.firstChunkAt = firstChunkAt;
      }

      if (finishedAt !== undefined) {
        nextStreamInput.finishedAt = finishedAt;
      }

      if (error !== undefined) {
        nextStreamInput.error = error;
      }

      const nextStream = createInspectedStream(nextStreamInput);

      byId.set(event.id, nextStream);
    }

    return [...byId.values()];
  });

  return {
    events: recordedEvents,
    streams: inspectedStreams,
    stream(idOrName) {
      const existingSelector = streamSelectors.get(idOrName);

      if (existingSelector) {
        return existingSelector;
      }

      const selector = computed(() => inspectedStreams().find((stream) => stream.id === idOrName || stream.name === idOrName));
      streamSelectors.set(idOrName, selector);
      return selector;
    },
    clear() {
      recordedEvents([]);
    },
    dispose() {
      inspectedStreams.stop();

      for (const selector of streamSelectors.values()) {
        selector.stop();
      }

      streamSelectors.clear();

      if (globalThis.__QORE_DEVTOOLS__ === record) {
        globalThis.__QORE_DEVTOOLS__ = previousHook;
      }
    }
  };
}

type InspectedStreamInput = {
  id: string;
  name?: string;
  status?: ResponseStatus;
  value?: unknown;
  chunkCount: number;
  createdAt: number;
  updatedAt: number;
  firstChunkAt?: number;
  finishedAt?: number;
  terminal: boolean;
  error?: Error | null;
};

function createInspectedStream(input: InspectedStreamInput): QoreInspectedStream {
  const stream: QoreInspectedStream = {
    id: input.id,
    chunkCount: input.chunkCount,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    terminal: input.terminal
  };

  if (input.name !== undefined) {
    stream.name = input.name;
  }

  if (input.status !== undefined) {
    stream.status = input.status;
  }

  if (input.value !== undefined) {
    stream.value = input.value;
  }

  if (input.finishedAt !== undefined) {
    stream.finishedAt = input.finishedAt;
  }

  if (input.firstChunkAt !== undefined) {
    stream.firstChunkAt = input.firstChunkAt;
    stream.firstChunkLatencyMs = Math.max(0, input.firstChunkAt - input.createdAt);
  }

  const durationEnd = input.finishedAt ?? input.updatedAt;
  const durationMs = Math.max(0, durationEnd - input.createdAt);
  stream.durationMs = durationMs;

  if (input.chunkCount > 0) {
    stream.chunksPerSecond = input.chunkCount / (Math.max(1, durationMs) / 1000);
  }

  if (input.error !== undefined) {
    stream.error = input.error;
  }

  return stream;
}

function withoutPayload(event: QoreDevtoolsEvent): QoreDevtoolsEvent {
  const nextEvent: QoreDevtoolsStreamEvent = {
    kind: event.kind,
    phase: event.phase,
    id: event.id,
    timestamp: event.timestamp
  };

  if (event.name !== undefined) {
    nextEvent.name = event.name;
  }

  if (event.status !== undefined) {
    nextEvent.status = event.status;
  }

  if (event.chunkCount !== undefined) {
    nextEvent.chunkCount = event.chunkCount;
  }

  if (event.error !== undefined) {
    nextEvent.error = event.error;
  }

  return nextEvent;
}

function isTerminalPhase(phase: QoreDevtoolsStreamPhase): boolean {
  return phase === 'complete' || phase === 'error' || phase === 'abort';
}

function forwardDevtoolsEvent(target: QoreDevtoolsTarget, event: QoreDevtoolsEvent): void {
  if (!target) {
    return;
  }

  try {
    if (typeof target === 'function') {
      target(event);
      return;
    }

    if (target.enabled === false) {
      return;
    }

    target.events?.push(event);
    target.emit?.(event);
  } catch {
    // Inspector forwarding must remain best-effort for the same reason as raw hook emission.
  }
}
