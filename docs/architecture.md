# Architecture

Qore is a small runtime with four layers.

```text
Provider / AsyncIterable
        |
        v
Qore Stream Runtime
        |
        v
Readonly Signal
        |
        v
DOM Binding
```

## Provider / AsyncIterable

Providers expose streaming data as async iterables. Qore ships adapters for OpenAI, Anthropic, OpenRouter, DeepSeek, Ollama, generic SSE, and generic line-delimited streams.

Adapters should run on the server or another trusted runtime when they need API keys.

## Stream Runtime

The stream runtime owns:

- lifecycle: `idle`, `streaming`, `completed`, `failed`, `aborted`
- abort propagation
- retry and resume contracts for hosted SSE providers
- backpressure buffering
- async iterator bridging
- reducer-based accumulation
- development-time stream inspection through `globalThis.__QORE_DEVTOOLS__`

## Readonly Signal

Every `QoreStream` is a readonly signal:

```js
const answer = stream(model.chat('hello'));
answer();
```

Users can observe stream state, but they cannot mutate runtime-owned fields such as `status`, `chunks`, or `error`.

## DOM Binding

The DOM layer is intentionally direct. `text(() => answer())` subscribes to the signal and updates a text node.

There is no virtual DOM path on the hot streaming update.

## Server Boundary

Qore includes `createSSEResponse(...)` so applications can produce server-side streams and consume them with the same client runtime.

The DOM layer is browser-only in `1.0.x`; SSR and hydration are explicit future work.
