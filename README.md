# Qore

[![npm version](https://img.shields.io/npm/v/%40qorejs%2Fqore?color=0f766e&label=npm)](https://www.npmjs.com/package/@qorejs/qore)
[![latest release](https://img.shields.io/github/v/release/qorejs/qore?color=0f766e&label=release)](https://github.com/qorejs/qore/releases/latest)
[![ci](https://github.com/qorejs/qore/actions/workflows/ci.yml/badge.svg)](https://github.com/qorejs/qore/actions/workflows/ci.yml)
[![browser smoke](https://img.shields.io/badge/browser-smoke-playwright-45ba63)](#browser-regression)
[![release checks](https://github.com/qorejs/qore/actions/workflows/release-check.yml/badge.svg)](https://github.com/qorejs/qore/actions/workflows/release-check.yml)
[![publish github packages](https://github.com/qorejs/qore/actions/workflows/publish-github-packages.yml/badge.svg)](https://github.com/qorejs/qore/actions/workflows/publish-github-packages.yml)
[![GitHub Packages](https://img.shields.io/badge/GitHub-Packages-181717?logo=github)](https://github.com/qorejs/qore/packages)
[![node >= 18](https://img.shields.io/badge/node-%3E%3D18-1f6feb)](https://nodejs.org/)
[![license: MIT](https://img.shields.io/badge/license-MIT-0f766e)](https://github.com/qorejs/qore/blob/main/LICENSE)

Qore is a streaming-response framework where `stream = signal`.

Instead of treating data as a snapshot, Qore treats it like a river. Tokens arrive piece by piece, and the UI should respond piece by piece too. No manual string accumulation. No scattered loading state. No partial rendering workaround layered on top of a snapshot-first mental model.

Quick links:

- [npm package](https://www.npmjs.com/package/@qorejs/qore)
- [latest release](https://github.com/qorejs/qore/releases/latest)
- [GitHub Packages](https://github.com/qorejs/qore/packages)
- [landing page source](https://github.com/qorejs/qore/blob/main/index.html)
- [streaming demo source](https://github.com/qorejs/qore/blob/main/examples/streaming-response.html)
- [benchmark page](https://github.com/qorejs/qore/blob/main/examples/benchmark.html)
- [continuous integration](https://github.com/qorejs/qore/actions/workflows/ci.yml)
- [release workflow](https://github.com/qorejs/qore/actions/workflows/release-check.yml)
- [contributing guide](https://github.com/qorejs/qore/blob/main/CONTRIBUTING.md)
- [security policy](https://github.com/qorejs/qore/blob/main/SECURITY.md)

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

For maintainers, the local npm release path now includes a fast preflight:

```bash
npm run publish:preflight
npm run publish:npm
```

The preflight checks npm auth, confirms the changelog matches `package.json`, and fails early if that exact version is already published.

- Package name: `@qorejs/qore`
- Module format: `ESM`
- Supported runtime: `Node >= 18`
- CI coverage: `Node 18`, `20`, and `22`
- Browser regression: Playwright desktop + mobile smoke coverage for the homepage, focused demo, and benchmark page
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

## Performance Model

Qore keeps the streaming hot path narrow:

- chunk commits append into an internal log instead of cloning the full history on every token
- public `chunks()` reads still return defensive copies, so consumers cannot corrupt runtime state
- `chunkCount()` tracks the internal log version directly, so status UIs can stay cheap during long generations
- DOM bindings update only the nodes that read the stream signal

That means a long AI answer can keep flowing through one signal and one text node without turning every token into a full transcript rewrite.

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

### `createOpenRouter(options?)`

```js
import { createOpenRouter, stream } from '@qorejs/qore';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  model: 'openai/gpt-4.1-mini'
});

const answer = stream(openrouter.chat('Why should stream be signal?'));
```

### `createDeepSeek(options?)`

```js
import { createDeepSeek, stream } from '@qorejs/qore';

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
  model: 'deepseek-chat'
});

const answer = stream(deepseek.chat('Why should stream be signal?'));
```

Provider adapters also accept a request `signal` so you can cancel in-flight streams explicitly:

```js
const controller = new AbortController();
const answer = stream(openrouter.chat('Keep streaming', {
  signal: controller.signal
}));

controller.abort('user navigated away');
```

### `createOllama(options?)`

If you want a local-first provider path, Qore can stream directly from Ollama:

```js
import { createOllama, stream } from '@qorejs/qore';

const ollama = createOllama({
  model: 'llama3.2'
});

const answer = stream(ollama.chat('Why should stream be signal?'));
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

### `createLineAdapter(options?)`

If your backend streams newline-delimited JSON instead of `text/event-stream`, Qore can adopt that too:

```js
import { createLineAdapter, stream } from '@qorejs/qore';

const provider = createLineAdapter({
  name: 'Local NDJSON Chat',
  url: 'http://localhost:11434/api/chat',
  buildRequest(request) {
    return {
      method: 'POST',
      body: JSON.stringify(request)
    };
  },
  buildChatRequest(input) {
    return {
      model: 'llama3.2',
      messages: [{ role: 'user', content: input }]
    };
  },
  lineToText(event) {
    return typeof event.data?.message?.content === 'string'
      ? event.data.message.content
      : undefined;
  }
});

const answer = stream(provider.chat('hello'));
```

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

For append-heavy DOM lists such as chat transcripts, pass a stable key:

```js
list(messages, (message) => h('article', {}, message.body), {
  key: (message) => message.id
});
```

## Server-Side SSE

If you want Qore to produce the server stream as well:

```js
import { createSSEResponse } from '@qorejs/qore';

export function handler() {
  return createSSEResponse(['hello', ' world']);
}
```

If you need orchestration:

```js
const merged = stream.merge([openai.chat('a'), anthropic.chat('b')]);
const fastest = stream.race([openai.chat('hello'), openrouter.chat('hello')]);
const resilient = stream.retryable(() => openai.chat('retry me'), {
  maxRetries: 2,
  backoff: 'exponential'
});
const liveAnswer = stream.switchMap(promptChanges, (prompt) => openai.chat(prompt));
```

Provider adapters can also retry dropped SSE connections and resume from the last event id:

```js
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  retry: {
    maxAttempts: 3,
    backoff: 'exponential'
  }
});
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

### `signal`, `computed`, `effect`, `createRoot`, `onCleanup`

```js
import { computed, createRoot, effect, onCleanup, signal, stream } from '@qorejs/qore';

const answer = stream(openai.chat('hello'));
const length = computed(() => answer().length);

const dispose = createRoot((dispose) => {
  effect(() => {
    console.log(length());
    onCleanup(() => console.log('effect disposed'));
  });

  return dispose;
});

dispose();
```

### `response`

`response` still exists, but it is closer to a lower-level state machine escape hatch for custom reducers and aggregators.

If your goal is to pipe a stream directly into the UI, prefer `stream(...)`.

## Demos

The repository includes a landing page and a focused streaming demo:

- [Landing Page Source](https://github.com/qorejs/qore/blob/main/index.html)
- [Homepage Logic](https://github.com/qorejs/qore/blob/main/examples/showcase.ts)
- [Homepage Styles](https://github.com/qorejs/qore/blob/main/examples/showcase.css)
- [Benchmark Page](https://github.com/qorejs/qore/blob/main/examples/benchmark.html)
- [Benchmark Logic](https://github.com/qorejs/qore/blob/main/examples/benchmark-page.ts)
- [Benchmark Core](https://github.com/qorejs/qore/blob/main/examples/benchmark-core.ts)
- [Focused Demo](https://github.com/qorejs/qore/blob/main/examples/streaming-response.html)
- [Focused Chat Logic](https://github.com/qorejs/qore/blob/main/examples/qore-chat.ts)
- [React Compare](https://github.com/qorejs/qore/blob/main/examples/react-chat.ts)

## Project Layout

```text
src/
  core/       stream, signal, response, iterable
  dom/        app mounting and DOM bindings
  providers/  OpenAI, Anthropic, OpenRouter, DeepSeek, Ollama, SSE, and line-stream adapters
  shared/     runtime utilities
  index.ts    public entrypoint

dist/
  src/        compiled package output
  examples/   built showcase scripts for local preview
  test/       compiled test output
```

For a local preview:

```bash
git clone git@github.com:qorejs/qore.git
cd qore
npm install
npm run build
python3 -m http.server 4173
```

Then open [http://127.0.0.1:4173/](http://127.0.0.1:4173/).

## Server And SSR

Qore's reactive core and stream runtime work in Node and browser environments today.

The DOM layer is intentionally browser-only right now:

- `signal`, `computed`, `effect`, `stream`, and provider adapters work in Node and the browser
- `h`, `text`, `mount`, and `createApp(...).mount(...)` require a browser-like `document`
- `canUseDOM()` is exported so integrations can branch cleanly before touching DOM APIs
- `assertCanUseDOM(name?)` is exported if you want to fail fast with the same browser-boundary error shape Qore uses internally

If you call DOM helpers without a browser-like runtime, Qore throws an entrypoint-specific error instead of failing later with a generic reference error. For example:

- `h() requires a browser-like environment`
- `mount() requires a browser-like environment`
- `createApp(...).mount(...) requires a browser-like environment`

Example:

```js
import { assertCanUseDOM, canUseDOM } from '@qorejs/qore';

if (canUseDOM()) {
  // Safe to call mount(), h(), text(), and other DOM entrypoints.
}

assertCanUseDOM('chat shell hydration');
```

That means the current `1.0.0` path is:

- stable reactive runtime
- stable streaming runtime
- explicit browser DOM boundary
- streaming SSR and hydration as a post-`1.0.0` expansion area unless the implementation is fully proven first

## Browser Regression

Install the browser binary once:

```bash
npm run browsers:install
```

Then run the browser smoke suite:

```bash
npm run test:browser
```

It validates:

- the homepage stream demo
- the focused streaming chat demo
- the dedicated benchmark page

The suite checks desktop and mobile layouts, watches for runtime console errors, exercises the primary interactions, and runs inside `release:check`.

CI also uploads the browser regression evidence as workflow artifacts. The bundle includes viewport screenshots, focused page-surface screenshots, the Playwright HTML report, a `benchmark-suite.json` attachment from the dedicated benchmark page, and a human-readable benchmark summary markdown file from the benchmark gate.

If a locked-down local shell cannot launch a supported headless browser, the script will defer to CI unless you force a hard local failure with `QORE_BROWSER_SMOKE_REQUIRED=1`.

Local preview ports can also be pinned when another process is already using the default range:

```bash
QORE_STATIC_PORT=4300 QORE_STATIC_PORT_END=4400 npm run test:browser
```

## Benchmark Methodology

Qore now includes a reproducible browser benchmark that compares two rendering paths against the same workload:

- `Qore stream = signal`: mount the transcript shell once and advance the same live text node as chunks arrive
- `Snapshot rerender baseline`: rebuild the transcript shell from a snapshot string on every chunk

Both paths use the same transcript history, the same chunk list, and the same final answer text. The benchmark reports first paint time, mutation records, node churn, and regenerated markup so the difference is visible instead of rhetorical.

## GitHub Packages

The repository includes GitHub Actions workflows for both release validation and GitHub Packages publishing.

- Release validation: `.github/workflows/release-check.yml`
- GitHub Packages publish: `.github/workflows/publish-github-packages.yml`
- Both workflows can be triggered manually from the Actions tab
- Publishing a GitHub Release triggers both the release check and the GitHub Packages publish flow
- The publish workflow validates the release tag, changelog, test suite, and tarball before it pushes the package
- The publish workflow uses the repository `GITHUB_TOKEN`, which GitHub documents as the recommended way to publish packages from the workflow repository
- GitHub Packages starts new packages as private by default, so you may want to switch the package visibility to public after the first publish

Because the package already includes the correct `repository` field in `package.json`, GitHub Packages can link the package back to `qorejs/qore` when the workflow publishes it.

## Project Hygiene

The repository also includes:

- `CONTRIBUTING.md` for contributor expectations and release flow
- `SECURITY.md` for responsible disclosure
- issue templates for bugs and feature requests
- a pull request template
- `.github/release.yml` to keep GitHub release notes structured

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
- OpenAI, Anthropic, OpenRouter, DeepSeek, Ollama, and generic streaming adapters

## Roadmap

- Tighten the hydration model around server-streamed rendering
- Publish repeatable benchmarks that compare Qore with React and the Vercel AI SDK
