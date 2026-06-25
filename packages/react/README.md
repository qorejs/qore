# @qorejs/react

React adapter for Qore, the reactive stream runtime for AI-native interfaces.

```bash
npm i @qorejs/qore @qorejs/react
```

## Why This Package Exists

Qore streams are already readonly signals and async iterables. React apps can subscribe to them through React's external store contract instead of copying streamed tokens into component state by hand.

```text
Provider / AsyncIterable -> QoreStream -> React external store -> Component view
```

## useQoreStream

Use `useQoreStream` when a React component owns the stream lifecycle.

```tsx
import { stream } from '@qorejs/qore';
import { useQoreStream } from '@qorejs/react';

function Answer({ prompt }: { prompt: string }) {
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

`useQoreStream` starts the stream after mount, subscribes through `useSyncExternalStore`, and aborts the stream when dependencies change or the component unmounts. Pass `{ enabled: false }` to keep the hook subscribed to an idle snapshot without starting network work.

## useQoreStreamSnapshot

Use `useQoreStreamSnapshot` when the stream is created outside React and the component only needs a live snapshot.

```tsx
import type { QoreStream } from '@qorejs/qore';
import { useQoreStreamSnapshot } from '@qorejs/react';

function Transcript({ answer }: { answer: QoreStream<string, string> }) {
  const snapshot = useQoreStreamSnapshot(answer, { initialValue: '' });
  return <p>{snapshot.value}</p>;
}
```

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

function Counter({ count }: { count: ReadonlySignal<number> }) {
  const value = useQoreSignal(count);
  return <span>{value}</span>;
}
```

## Safety Notes

Provider adapters are intended for server-side or trusted runtimes. In browser React apps, expose your own SSE or NDJSON endpoint and stream that endpoint into Qore.

Keep dependency arrays honest. If the stream factory reads `prompt`, `model`, `conversationId`, or auth/session state, include those values in the dependency list.
