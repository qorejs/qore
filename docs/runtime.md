# Runtime

The stream runtime is the core of Qore.

## Lifecycle

Every `QoreStream` exposes readonly lifecycle signals:

```js
answer.status();     // idle | pending | streaming | completed | failed | aborted
answer.error();      // Error | null
answer.chunkCount(); // number
answer.buffered();   // queued chunks
answer.dropped();    // dropped chunks
```

Runtime-owned state is readonly from user code, so external callers cannot force inconsistent states.

## Backpressure

```js
const answer = stream.withBackpressure(source, {
  interval: 16,
  buffer: 8,
  overflow: 'drop-oldest'
});
```

Backpressure controls how quickly chunks commit into the signal and UI.

Overflow strategies:

- `wait`
- `drop-oldest`
- `drop-newest`
- `error`

## Orchestration

Qore includes stream composition primitives for agent and realtime flows:

```js
stream.merge([tokens, toolCalls, status]);
stream.concat([retrieve, summarize, format]);
stream.pipe(retrieve, [(docs) => summarize(docs), (summary) => format(summary)]);
stream.race([openai.chat(q), anthropic.chat(q)]);
stream.retryable(() => openai.chat(q), { maxRetries: 2 });
stream.switchMap(promptChanges, (prompt) => openai.chat(prompt));
```

The composed result is still a stream signal.

## Event Streams

Provider streams are only the transport boundary. Agent interfaces need a richer runtime surface: text tokens, tool calls, status updates, reasoning notes, diffs, artifacts, retries, and errors can all be modeled as typed events.

```js
const events = stream.events(agent.run(task));

const markdown = events.select('text', {
  seed: '',
  reduce: (current, event) => current + event.text
});
const toolCalls = events.select('tool_call');
const status = events.select('status');
const diffs = events.select('diff', {
  seed: '',
  reduce: (current, event) => current + event.patch
});
```

The full event timeline remains available through `events()`. Each selector is also a stream signal, so one UI region can render the timeline while another region renders only the accumulated markdown or diff.

A complete typed example lives in [`examples/agent-event-stream.ts`](../examples/agent-event-stream.ts). It projects one agent event timeline into markdown, status, tool-call, tool-result, diff, and artifact surfaces without creating separate state stores.


## DevTools Hook

Install `globalThis.__QORE_DEVTOOLS__` in development to inspect stream lifecycle and chunk flow without changing app code.

```js
globalThis.__QORE_DEVTOOLS__ = {
  events: [],
  emit(event) {
    console.log(event.phase, event.name, event.status);
  }
};

const answer = stream(model.chat('hello'), { name: 'answer' });
```

Named streams expose stable `id` and optional `name` fields. DevTools events are best-effort and never affect stream control flow. See [`docs/devtools.md`](./devtools.md) for the event shape.

## Abort

Streams can be aborted from the Qore stream object or from provider request options:

```js
const controller = new AbortController();
const answer = stream(openai.chat('hello', { signal: controller.signal }));

controller.abort();
answer.abort();
```
