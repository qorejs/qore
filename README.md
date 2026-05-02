# Qore

[![npm version](https://img.shields.io/npm/v/%40qorejs%2Fqore?color=0f766e&label=npm)](https://www.npmjs.com/package/@qorejs/qore)
[![GitHub Packages](https://img.shields.io/badge/GitHub-Packages-181717?logo=github)](https://github.com/qorejs/qore/packages)

Qore is a streaming-response framework where `stream = signal`.

Instead of treating data as a snapshot, Qore treats it like a river. Tokens arrive piece by piece, and the UI should respond piece by piece too. No manual string accumulation. No scattered loading state. No partial rendering workaround layered on top of a snapshot-first mental model.

## Installation

From npm:

```bash
npm i @qorejs/qore
```

From GitHub Packages:

```bash
echo "@qorejs:registry=https://npm.pkg.github.com" >> .npmrc
npm i @qorejs/qore
```

GitHub Packages installs require an authenticated session against `https://npm.pkg.github.com`.

- Package name: `@qorejs/qore`
- Module format: `ESM`
- Supported runtime: `Node >= 18`
- Registries:
  - npm: [npmjs.com/package/@qorejs/qore](https://www.npmjs.com/package/@qorejs/qore)
  - GitHub Packages: [github.com/qorejs/qore/packages](https://github.com/qorejs/qore/packages)

## Core Idea

`stream` is how data flows.
`signal` is how the UI reacts.

In Qore, they are two sides of the same primitive:

```js
import { createOpenAI, h, stream, text } from '@qorejs/qore';

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const answer = stream(openai.chat('hello'));

return h('div', {}, text(() => answer()));
```

Here, `answer` is all of the following at once:

- A read-only `signal`, so `answer()` returns the current accumulated value
- An `AsyncIterable`, so you can still use `for await...of`
- A lifecycle-aware streaming state, with `status()`, `streaming()`, `error()`, and `chunks()`

## Why Qore

- React treats streaming as a special case that needs extra machinery
- SolidJS has excellent signals, but no native stream primitive
- Vue has ergonomic refs, but stream handling still lives outside the core model
- Qore makes `stream = signal` the core API from the start

## Quick Start

```js
import { h, mount, stream, text } from '@qorejs/qore';

const answer = stream(async function* () {
  yield 'stream';
  yield ' = ';
  yield 'signal';
}());

mount('#app', () => h('div', { className: 'answer' }, text(() => answer())));
```

This updates only the text node that depends on the stream. It does not re-render the whole tree.

## Providers

### `createOpenAI(options?)`

```js
import { createOpenAI, stream } from '@qorejs/qore';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-5'
});

const answer = stream(openai.chat('Why should stream be signal?'));
```

### `createAnthropic(options?)`

```js
import { createAnthropic, stream } from '@qorejs/qore';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-sonnet-4-20250514'
});

const answer = stream(anthropic.chat('Why should stream be signal?'));
```

### `createSSEAdapter(options?)`

If your backend already streams `text/event-stream`, Qore can adopt it directly:

```js
import { createSSEAdapter, stream } from '@qorejs/qore';

const provider = createSSEAdapter({
  name: 'Local Chat',
  url: 'http://localhost:3000/api/chat',
  buildRequest(request) {
    return {
      method: 'POST',
      body: JSON.stringify(request)
    };
  },
  buildChatRequest(input) {
    return { prompt: input };
  },
  eventToText(event) {
    return event.data?.type === 'token' ? event.data.text : undefined;
  }
});

const answer = stream(provider.chat('hello'));
```

That makes `stream(provider.chat(...))` a general entry point instead of something tied to a single SDK.

## API Shape

### `stream(source, options?)`

By default, `stream(...)` accumulates chunks into a text signal:

```js
const answer = stream(openai.chat('hello'));

answer();           // current text
answer.status();    // idle | pending | streaming | completed | error | aborted
answer.streaming(); // boolean
answer.chunks();    // raw chunks
await answer.ready; // wait for completion
```

If you need structured streams:

```js
const events = stream.list(eventSource);
const latest = stream.latest(modelEvents);
```

### Backpressure

```js
const answer = stream.withBackpressure(openai.chat('hello'), {
  interval: 16,
  buffer: 8,
  overflow: 'drop-oldest'
});
```

Backpressure is not just a delay wrapper:

- `interval`: the minimum spacing between chunk delivery into the signal and UI
- `buffer`: the maximum number of queued chunks before the UI catches up
- `overflow`: what to do when the buffer is full: `wait`, `drop-oldest`, `drop-newest`, or `error`

You can also observe stream pressure directly:

```js
answer.buffered(); // how many chunks are queued right now
answer.dropped();  // how many chunks were dropped by the overflow policy
```

### `signal`, `computed`, `effect`

```js
import { computed, signal, stream } from '@qorejs/qore';

const answer = stream(openai.chat('hello'));
const length = computed(() => answer().length);
```

### `response`

`response` still exists, but it is closer to a lower-level state machine escape hatch for custom reducers and aggregators.

If your goal is to pipe a stream directly into the UI, prefer `stream(...)`.

## Demos

The repository includes a landing page and a focused streaming demo:

- [Landing Page Source](https://github.com/qorejs/qore/blob/main/index.html)
- [Homepage Logic](https://github.com/qorejs/qore/blob/main/examples/showcase.js)
- [Homepage Styles](https://github.com/qorejs/qore/blob/main/examples/showcase.css)
- [Focused Demo](https://github.com/qorejs/qore/blob/main/examples/streaming-response.html)
- [Focused Chat Logic](https://github.com/qorejs/qore/blob/main/examples/qore-chat.js)
- [React Compare](https://github.com/qorejs/qore/blob/main/examples/react-chat.jsx)

For a local preview:

```bash
git clone git@github.com:qorejs/qore.git
cd qore
python3 -m http.server 4173
```

Then open [http://127.0.0.1:4173/](http://127.0.0.1:4173/).

## GitHub Packages

The repository includes a GitHub Actions workflow that can publish the package to GitHub Packages and associate it with this repository.

- Workflow file: `.github/workflows/publish-github-packages.yml`
- Trigger it manually from the Actions tab, or publish a GitHub Release to trigger it automatically
- The workflow uses the repository `GITHUB_TOKEN`, which GitHub documents as the recommended way to publish packages from the workflow repository
- GitHub Packages starts new packages as private by default, so you may want to switch the package visibility to public after the first publish

Because the package already includes the correct `repository` field in `package.json`, GitHub Packages can link the package back to `qorejs/qore` when the workflow publishes it.

## Package Boundary

Qore does not ship a built-in catalog of buttons, dialogs, tabs, or other UI primitives.

The core package does only three things:

- Move streams into state
- Move state into the UI
- Keep the whole process finely reactive

Anything that does not serve `streaming response` belongs in an experimental layer or a separate package.

## Testing

```bash
npm test
```

The current test suite covers:

- `signal`, `computed`, and `effect`
- The core `stream = signal` behavior
- `response` interoperability with async iterables
- OpenAI, Anthropic, and generic SSE adapters

## Roadmap

- Tighten the hydration model around server-streamed rendering
- Publish repeatable benchmarks that compare Qore with React and the Vercel AI SDK
