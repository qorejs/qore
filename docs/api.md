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
- `stream.json(source, options?)`: parse JSON text into structured signal state
- `stream.ndjson(source, options?)`: parse line-delimited JSON text into a structured event signal
- `stream.from(source, options?)`: normalize any iterable source, optionally with source delay
- `stream.events(source, options?)`: accumulate typed runtime events into a timeline signal
- `stream.withBackpressure(source, options?)`: pace stream commits
- `stream.merge(sources, options?)`: merge multiple streams
- `stream.concat(sources, options?)`: run sources in sequence
- `stream.pipe(source, stages, options?)`: run staged stream pipelines
- `stream.race(sources, options?)`: use the first completing stream
- `stream.retryable(factory, options?)`: retry a stream factory
- `stream.switchMap(source, project, options?)`: switch to the latest inner stream

### Event Streams

```js
const events = stream.events(agent.run(task));

const text = events.select('text', {
  seed: '',
  reduce: (current, event) => current + event.text
});
const tools = events.select('tool_call');
const status = events.select('status');
const diff = events.select('diff', {
  seed: '',
  reduce: (current, event) => current + event.patch
});
```

`from(source, options?)` remains available as a standalone export for callers that prefer named helpers. `stream.from(source, options?)` is the same helper exposed on the factory for API discoverability.

`stream.events(...)` returns a `QoreEventStream`: a `QoreStream` whose current value is the full event timeline. `select(type)` projects one event type into another stream signal. Without a custom reducer, selected streams accumulate matching events into an array. See [`examples/agent-event-stream.ts`](../examples/agent-event-stream.ts) for a complete typed agent surface.

### Structured JSON

```js
const result = stream.json(provider.chat(prompt), {
  validate(value) {
    return typeof value === 'object' && value !== null;
  }
});
```

`stream.json(...)` parses accumulated text after each chunk. The signal value is `null` until valid JSON is available, then it becomes the parsed object. If the source finishes without valid JSON, the stream fails through the normal `status`, `error`, and `ready` lifecycle.

```js
const events = stream.ndjson(source);
```

`stream.ndjson(...)` parses each complete line as JSON, publishes each parsed object as a chunk, and exposes the accumulated event list as signal state. Blank lines are ignored. An invalid trailing line fails the stream while preserving already-published events.

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


## DevTools

```js
const inspector = createStreamInspector({ maxEvents: 200 });
const answer = stream(source, { name: 'answer' });
```

- `QoreStream.id`: stable runtime id for inspection.
- `QoreStream.name`: optional stream name from `StreamOptions.name`.
- `createStreamInspector(options?)`: install a disposable inspector over the global DevTools hook.
- `QoreStreamInspector.events()`: recent raw stream lifecycle events.
- `QoreStreamInspector.streams()`: derived stream summaries for custom panels and tests.
- `QoreStreamInspector.stream(idOrName)`: subscribe to one stream summary by runtime id or name.
- `QoreInspectedStream`: includes status, chunk count, terminal state, first-chunk latency, duration, and chunks-per-second metrics.
- `QoreDevtoolsEvent`: exported TypeScript event type for custom inspectors.
