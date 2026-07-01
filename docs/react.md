# React Adapter

Qore's core runtime is framework-neutral. The React adapter lets React apps consume Qore streams without treating streaming as a special rendering case.

> Status: the adapter is release-ready in [`packages/react`](../packages/react), but the npm package is not published yet. Publishing currently fails with npm `E404` for `@qorejs/react`, which means the `@qorejs` npm scope/package access still needs to be provisioned before the install command below becomes valid.

```bash
# Available after npm package access is provisioned.
npm i @qorejs/qore @qorejs/react
```

## Why It Exists

React is still the UI shell for many production AI products. Qore should not force those teams to switch renderers before they can use `stream = signal`.

The adapter keeps Qore in the streaming runtime layer:

```text
Provider / AsyncIterable
  -> QoreStream
  -> React external store
  -> Component view
```

A `QoreStream` remains the source of truth. React subscribes to it through `useSyncExternalStore`, which is the React-supported bridge for external reactive stores.

## useQoreStream

Use `useQoreStream` when a component owns the stream lifecycle.

```tsx
import { stream } from '@qorejs/qore';
import { useQoreStream } from '@qorejs/react';

export function Answer({ prompt }: { prompt: string }) {
  const answer = useQoreStream(
    () => stream(fetch(`/api/chat?prompt=${encodeURIComponent(prompt)}`).then((response) => response.body)),
    [prompt],
    { initialValue: '' }
  );

  return (
    <article>
      <p>{answer.value}</p>
      <small>{answer.status}</small>
      <button onClick={() => answer.abort()}>Stop</button>
    </article>
  );
}
```

When dependencies change, the hook aborts the previous stream and starts a new one. When the component unmounts, the active stream is aborted. Pass `{ enabled: false }` to keep the hook subscribed to an idle snapshot without starting network work.

## useQoreStreamSnapshot

Use `useQoreStreamSnapshot` when the stream is created outside React and the component only needs a live snapshot.

```tsx
import type { QoreStream } from '@qorejs/qore';
import { useQoreStreamSnapshot } from '@qorejs/react';

export function Transcript({ answer }: { answer: QoreStream<string, string> }) {
  const snapshot = useQoreStreamSnapshot(answer, { initialValue: '' });

  return <p>{snapshot.value}</p>;
}
```

The returned object includes the stream value plus lifecycle fields such as `status`, `error`, `chunks`, `streaming`, `completed`, `failed`, `aborted`, `buffered`, and `dropped`.

## useQoreSignalSelector

Use `useQoreSignalSelector` when a React component only needs one derived slice of a Qore signal. The selector keeps React renders focused on the value that component actually reads.

```tsx
import type { QoreStream } from '@qorejs/qore';
import { useQoreSignalSelector } from '@qorejs/react';

function TokenCounter({ answer }: { answer: QoreStream<string, string> }) {
  const tokenCount = useQoreSignalSelector(answer.chunks, (chunks) => chunks.length);
  return <span>{tokenCount}</span>;
}
```

Pass `isEqual` when the selected value is an object and you want to preserve the previous reference until the meaningful fields change.

## useQoreSignal

Use `useQoreSignal` for any Qore readonly signal.

```tsx
import type { ReadonlySignal } from '@qorejs/qore';
import { useQoreSignal } from '@qorejs/react';

export function Counter({ count }: { count: ReadonlySignal<number> }) {
  const value = useQoreSignal(count);
  return <span>{value}</span>;
}
```

## Safety Notes

Provider adapters are still intended for server-side or trusted runtimes. In browser React apps, stream from your own SSE or NDJSON endpoint instead of exposing provider API keys.

Keep dependency arrays honest. If the stream factory reads `prompt`, `model`, `conversationId`, or auth/session state, include those values in the dependency list.
