# DevTools Hook

Qore exposes a lightweight development hook for stream inspection. It is inert by default and does not install any global state unless your app provides one.

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
