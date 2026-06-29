# DevTools Hook

Qore exposes a lightweight development hook for stream inspection. It is inert by default and does not install any global state unless your app provides one.

## Stream Inspector

For local dashboards, tests, and playgrounds, use the built-in inspector wrapper:

```js
import { createStreamInspector, stream } from '@qorejs/qore';

const inspector = createStreamInspector({ maxEvents: 200 });

const answer = stream(openai.chat('hello'), { name: 'answer' });
await answer.ready;

console.table(inspector.streams());
console.log(inspector.events());

inspector.dispose();
```

`inspector.events()` is a readonly signal containing the recent raw DevTools events. `inspector.streams()` is a derived readonly signal summarizing each observed stream by `id`, `name`, `status`, `chunkCount`, timestamps, and latest value.

Use `capturePayloads: false` when you want lifecycle timing without retaining token payloads:

```js
const inspector = createStreamInspector({
  maxEvents: 500,
  capturePayloads: false
});
```

Always call `dispose()` when a test, story, or custom panel is torn down. Disposal restores the previous global hook instead of leaving instrumentation attached.

## Raw Hook

```js
globalThis.__QORE_DEVTOOLS__ = {
  events: [],
  emit(event) {
    console.log(event.phase, event.name, event.status);
  }
};

const answer = stream(openai.chat('hello'), { name: 'answer' });
```

Each stream emits lifecycle events such as `create`, `status`, `chunk`, `complete`, `error`, and `abort`.

```ts
type QoreDevtoolsStreamEvent = {
  kind: 'stream';
  phase: 'create' | 'status' | 'chunk' | 'complete' | 'error' | 'abort';
  id: string;
  name?: string;
  status?: ResponseStatus;
  chunk?: unknown;
  value?: unknown;
  chunkCount?: number;
  error?: Error | null;
  timestamp: number;
};
```

Use `name` in stream options when you want traces to stay readable:

```js
const events = stream.events(agent.run(task), { name: 'agent-events' });
const markdown = events.select('text', {
  name: 'agent-markdown',
  seed: '',
  reduce: (current, event) => current + event.text
});
```

The hook is intentionally small. It gives browser extensions, custom inspectors, tests, and local dashboards a stable event surface without making the runtime depend on a DevTools package.
