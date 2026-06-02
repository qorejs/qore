# API Reference

This is the short public API map. See the generated TypeScript declarations for exact signatures.

## Reactivity

```js
import { batch, computed, createRoot, effect, onCleanup, signal } from '@qorejs/qore';
```

- `signal(initial)`: create writable reactive state
- `computed(fn)`: create derived readonly state
- `effect(fn, options?)`: run side effects when dependencies change
- `batch(fn)`: group reactive writes
- `createRoot(fn)`: create an owner scope for disposal
- `onCleanup(fn)`: register cleanup inside an owner or effect

## Streams

```js
import { stream } from '@qorejs/qore';
```

- `stream(source, options?)`: accumulate chunks into a text signal
- `stream.list(source, options?)`: accumulate chunks into an array signal
- `stream.latest(source, options?)`: keep only the latest chunk
- `stream.withBackpressure(source, options?)`: pace stream commits
- `stream.merge(sources, options?)`: merge multiple streams
- `stream.concat(sources, options?)`: run sources in sequence
- `stream.pipe(source, stages, options?)`: run staged stream pipelines
- `stream.race(sources, options?)`: use the first completing stream
- `stream.retryable(factory, options?)`: retry a stream factory
- `stream.switchMap(source, project, options?)`: switch to the latest inner stream

## DOM

```js
import { h, list, mount, text } from '@qorejs/qore';
```

- `h(tag, props, ...children)`: create DOM elements
- `text(valueOrGetter)`: bind text to a value or signal
- `list(source, render, options?)`: render iterable sources, with keyed append support
- `mount(target, view)`: mount a view and return a disposer

DOM APIs require a browser-like `document`.

## Server

```js
import { createSSEResponse } from '@qorejs/qore';
```

`createSSEResponse(...)` turns strings, events, or async iterables into a standards-compatible `text/event-stream` response.
