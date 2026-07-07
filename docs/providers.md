# Providers

Provider adapters connect external model streams to Qore's stream runtime.

## Security Rule

Provider adapters are intended for server-side or trusted runtimes. Do not put provider API keys in browser code.

For browser apps, expose your own endpoint:

```text
Browser -> your /api/chat SSE or NDJSON endpoint -> provider
```

Then consume that endpoint with `createSSEAdapter(...)`, `createLineAdapter(...)`, or a custom async iterable.

## Hosted SSE Providers

Supported adapters:

- `createOpenAI(...)`
- `createAnthropic(...)`
- `createOpenRouter(...)`
- `createDeepSeek(...)`

Common hosted SSE support:

- async iterable text streaming
- typed event streaming on provider-specific surfaces
- request abort via `AbortSignal`
- retry options
- `Last-Event-ID` resume for dropped SSE connections
- metadata normalization helpers

## Local And Generic Providers

Supported adapters:

- `createOllama(...)`
- `createSSEAdapter(...)`
- `createLineAdapter(...)`

`createLineAdapter(...)` is useful for NDJSON and line-delimited event streams such as local model servers or internal services.

## Example

```js
import { createOpenAI, stream } from '@qorejs/qore';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-5'
});

const answer = stream(openai.chat('Explain stream = signal'));
```

Keep this code on the server when it uses real secrets.


## Server Boundary

Provider adapters are designed for server-side or otherwise trusted runtimes. A browser application should not receive provider API keys. The recommended production path is:

```text
Browser UI -> your SSE / NDJSON endpoint -> provider adapter -> model provider
```

Then the browser consumes your endpoint as a Qore stream:

```ts
const answer = stream(fetch('/api/agent').then((response) => response.body));
```

For a complete application boundary example, see [`examples/server-sse-to-qore-client.ts`](../examples/server-sse-to-qore-client.ts).
