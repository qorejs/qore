# Concepts

Qore is built around one primitive:

```text
stream = signal
```

A stream is how data moves. A signal is how UI reacts. Qore treats them as one runtime surface instead of forcing streamed data through a separate state layer.

## The Problem

Most UI frameworks start with a snapshot model:

```text
fetch -> state snapshot -> render
```

AI and realtime interfaces are different. The useful data often arrives as a sequence:

```text
token -> token -> tool event -> status -> token -> done
```

If each chunk has to be copied into component state, reconciled, and rerendered as a transcript snapshot, the runtime path becomes wider than the problem needs.

## The Qore Model

```js
const answer = stream(provider.chat(prompt));

answer();        // current accumulated value
answer.status(); // streaming lifecycle

for await (const chunk of answer) {
  // optional logic-side consumption
}
```

The same value is:

- a readonly signal
- an async iterable
- a lifecycle-aware stream state

That means a UI can bind directly to streamed data:

```js
h('article', {}, text(() => answer()));
```

The text node updates because the stream signal changed. The transcript shell does not need to be rebuilt.

## What Belongs In Qore

Qore focuses on streamed interface state:

- token streams
- tool-call streams
- status streams
- markdown streams
- diff streams
- realtime event streams

It does not ship a button, dialog, or tab catalog. Those belong in application UI or a separate package.
