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
