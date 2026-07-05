# Qore

[![npm version](https://img.shields.io/npm/v/%40qorejs%2Fqore?color=0f766e&label=npm)](https://www.npmjs.com/package/@qorejs/qore)
[![latest release](https://img.shields.io/github/v/release/qorejs/qore?color=0f766e&label=release)](https://github.com/qorejs/qore/releases/latest)
[![ci](https://github.com/qorejs/qore/actions/workflows/ci.yml/badge.svg)](https://github.com/qorejs/qore/actions/workflows/ci.yml)
[![release checks](https://github.com/qorejs/qore/actions/workflows/release-check.yml/badge.svg)](https://github.com/qorejs/qore/actions/workflows/release-check.yml)
[![node >= 18](https://img.shields.io/badge/node-%3E%3D18-1f6feb)](https://nodejs.org/)
[![license: MIT](https://img.shields.io/badge/license-MIT-0f766e)](https://github.com/qorejs/qore/blob/main/LICENSE)

Qore is a reactive stream runtime for AI-native interfaces.

Its core primitive is `stream = signal`: an async stream is also a readonly signal, so tokens, tool events, status updates, markdown fragments, or diffs can flow directly into UI state.

## Install

```bash
npm i @qorejs/qore
```

## 30-Second Demo

```js
import { createSSEResponse, h, mount, stream, text } from '@qorejs/qore';

// Server: expose your provider as SSE.
export function handler() {
  return createSSEResponse(async function* () {
    yield 'stream';
    yield ' = ';
    yield 'signal';
  }());
}

// Browser: consume the stream as one reactive value.
const answer = stream(fetch('/api/chat').then((response) => response.body));

mount('#app', () =>
  h('main', {}, text(() => answer()))
);
```

`answer` is a readonly signal and an async iterable. The UI reads `answer()`, and Qore updates only the DOM node that depends on it.

## Why Qore

React/Vercel AI SDK:

```text
Token -> Hook state -> Component render -> Reconcile
```

Qore:

```text
Token -> Stream signal -> Text node
```

That is the core difference. Qore is not trying to be another AI SDK. It is the runtime layer that makes streamed data reactive.

## Event Streams

AI interfaces do not only stream text. They stream status, tool calls, reasoning, diffs, artifacts, retries, and errors.

```js
const events = stream.events(agent.run(task));

const text = events.select('text', {
  seed: '',
  reduce: (current, event) => current + event.text
});
const tools = events.select('tool_call');
const status = events.select('status');
const diff = events.select('diff');
```

Each selected stream is still a signal and an async iterable. A timeline can render every event, while a markdown pane can bind only to `text()`. The runnable shape is captured in [`examples/agent-event-stream.ts`](./examples/agent-event-stream.ts).

## Structured Output

Structured AI output should also flow through the same runtime path:

```ts
const result = stream.json<{ title: string; items: string[] }>(provider.chat(prompt));

result(); // null until valid JSON is available, then the parsed object
```

For line-delimited event streams, use the same idea per line:

```ts
const events = stream.ndjson<{ type: string; value: unknown }>(fetch('/api/events').then((r) => r.body));

events(); // accumulated structured events
```

Use `validate` when you want a typed guard before publishing parsed output into UI state. Invalid JSON or NDJSON fails through the normal stream lifecycle instead of becoming hidden glue code.


## React Adapter

Qore can be used inside React without replacing your UI stack. The release-ready adapter lives in [`packages/react`](./packages/react) and subscribes to Qore streams through React's external store contract, so the stream remains the source of truth while React renders the view.

> Status: `@qorejs/react` is release-ready in this repository, but npm publishing is still waiting on `@qorejs/react` package access for the `@qorejs` scope. The adapter smoke test passes; the package will be announced as published only after npm accepts it.

```tsx
import { stream } from '@qorejs/qore';
import { useQoreStream } from '@qorejs/react';

function Answer({ prompt }) {
  const answer = useQoreStream(
    () => stream(fetch(`/api/chat?prompt=${encodeURIComponent(prompt)}`).then((response) => response.body)),
    [prompt],
    { initialValue: '' }
  );

  return <p>{answer.value}</p>;
}
```

See [React Adapter](./docs/react.md) for lifecycle, status, abort, and signal subscription details.

## Provider Safety

Provider adapters are intended for server-side or trusted runtimes. Do not put `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or any vendor secret in browser code. For browsers, expose your own SSE or NDJSON endpoint and stream that endpoint into Qore.

## Inspect Streams

```js
import { createStreamInspector, stream } from '@qorejs/qore';

const inspector = createStreamInspector({ maxEvents: 200 });
const answer = stream(provider.chat(prompt), { name: 'answer' });
const trace = inspector.stream('answer');

await answer.ready;
console.log(trace()?.firstChunkLatencyMs, trace()?.chunksPerSecond);
inspector.dispose();
```

The inspector is zero-dependency and built on the same `__QORE_DEVTOOLS__` hook that custom panels can consume. It reports lifecycle events, terminal state, first-chunk latency, total duration, and chunk throughput.

## Documentation

- [Concepts](./docs/concepts.md): `stream = signal` and the mental model
- [Architecture](./docs/architecture.md): provider, runtime, signal, and DOM layers
- [API Reference](./docs/api.md): core primitives and composition helpers
- [Providers](./docs/providers.md): OpenAI, Anthropic, OpenRouter, DeepSeek, Ollama, SSE, and NDJSON
- [Runtime](./docs/runtime.md): backpressure, lifecycle, abort, retry, and orchestration
- [DevTools Hook](./docs/devtools.md): inspect stream lifecycle and chunk flow during development
- [React Adapter](./docs/react.md): use Qore streams inside existing React apps
- [Comparisons](./docs/comparisons.md): Qore vs React, Vercel AI SDK, Solid, and Vue
- [Benchmarks](./docs/benchmarks.md): methodology and current evidence
- [migration notes](./MIGRATION.md)
- [RELEASE.md](./RELEASE.md)

## Compatibility Matrix

| Surface | Status | Notes |
| --- | --- | --- |
| Node runtime | Supported | `Node >= 18` |
| Browser runtime | Supported | DOM entrypoints require `document` |
| Reactive core | Supported | `signal`, `computed`, `effect`, `batch`, `createRoot`, `onCleanup` |
| Stream runtime | Supported | backpressure, retry, orchestration, structured JSON/NDJSON, async iteration, abort, and DevTools hooks |
| Provider adapters | Supported | OpenAI, Anthropic, OpenRouter, DeepSeek, Ollama, generic SSE, generic line-stream |
| Browser DOM layer | Supported | `h`, `text`, `dynamic`, `list`, `mount`, `createApp(...).mount(...)` |
| React adapter | Release-ready | `packages/react` bridges Qore streams through `useSyncExternalStore`; npm publishing is waiting on scope access |
| Published package maps | Supported | JavaScript source maps and declaration maps ship in `dist/src` |
| SSR | Not supported | explicit browser-only DOM boundary in `1.0.x` |
| Hydration | Not supported | deferred until a fully proven implementation exists |

## Provider Support Matrix

| Adapter | Transport | Status | Notes |
| --- | --- | --- | --- |
| `createOpenAI(...)` | SSE | Supported | OpenAI Responses streaming |
| `createAnthropic(...)` | SSE | Supported | Anthropic Messages streaming |
| `createOpenRouter(...)` | SSE | Supported | chat-completions style SSE |
| `createDeepSeek(...)` | SSE | Supported | chat-completions style SSE |
| `createOllama(...)` | line-stream / NDJSON | Supported | local-first model path |
| `createSSEAdapter(...)` | SSE | Supported | generic hosted or self-managed SSE |
| `createLineAdapter(...)` | line-stream / NDJSON | Supported | generic line-delimited transport |

## Release Checklist

The canonical release checklist lives in [RELEASE.md](./RELEASE.md). The minimum local gate is:

```bash
npm ci
npm run release:check
```

Qore publishes through GitHub Actions trusted publishing with npm provenance enabled.
