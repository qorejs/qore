# Comparisons

Qore's target is not "another UI framework." Its target is streamed interface state.

## React / Vercel AI SDK

React and the Vercel AI SDK are strong tools for React applications. They still normally route streamed data through React state and render scheduling.

```text
React / Vercel AI SDK:
Token -> Hook state -> Component render -> Reconcile

Qore:
Token -> Stream signal -> Text node
```

Qore avoids snapshot-style transcript rewrites. That is the runtime distinction.

## Solid

Solid has excellent fine-grained reactivity. Qore's difference is the native stream primitive: a stream is already a signal and an async iterable.

## Vue

Vue refs are ergonomic, but provider streams still need to be adapted into state by user code. Qore makes that adaptation the default primitive.

## RxJS

RxJS is a powerful observable toolkit. Qore is smaller and UI-directed: the result of stream composition is still a readonly signal that can bind directly to a DOM node.

## When Not To Use Qore

Do not use Qore as a replacement for a full app framework if you need routing, forms, UI component catalogs, or a large ecosystem surface.

Use Qore where the hard part is streamed data becoming reactive interface state.


## Benchmark Language

Qore should not claim to be faster than React as a brand. The precise claim is narrower and more defensible:

```text
Fine-grained stream updates
vs
snapshot transcript rewrites
```

Qore optimizes the path where each token updates the stream signal and only the dependent UI surface changes. Snapshot baselines rewrite a larger transcript region. The benchmark should measure mutation count, added nodes, rewritten bytes, and update scope instead of turning framework names into a scoreboard.
