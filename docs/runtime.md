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

## Abort

Streams can be aborted from the Qore stream object or from provider request options:

```js
const controller = new AbortController();
const answer = stream(openai.chat('hello', { signal: controller.signal }));

controller.abort();
answer.abort();
```
