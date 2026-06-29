# Changelog

## Unreleased

## 1.0.4 - 2026-06-29

- Added `createStreamInspector(...)`, a zero-dependency wrapper around the DevTools hook that exposes recent stream events and derived stream summaries as readonly signals.
- Added inspector options for bounded event history and metadata-only capture so development panels can avoid retaining large token payloads.
- Documented the inspector workflow across the README, API reference, and DevTools guide.
- Expanded stream tests and the public API snapshot so inspector lifecycle, hook restoration, payload capture, and exported types are release-gated.

## 1.0.3 - 2026-06-29

- Added a lightweight `globalThis.__QORE_DEVTOOLS__` stream inspection hook with typed DevTools events for create, status, chunk, complete, error, and abort phases.
- Added stable `QoreStream.id` and optional `QoreStream.name` fields so stream traces and custom inspectors can identify runtime surfaces.
- Expanded the Agent Event Stream example to cover markdown, status, tool calls, tool results, diffs, artifacts, retries, and recoverable errors from one typed event timeline.
- Added runtime, API, and DevTools documentation for named streams and development-time stream inspection.
- Updated release and public API coverage so DevTools types and agent event surfaces are validated before publishing.

## 1.0.2 - 2026-06-25

- Added `stream.from(...)` as a factory alias for the existing `from(...)` helper so iterable source normalization is discoverable from the main stream primitive.
- Added `useQoreSignalSelector(...)` to the React adapter so React components can subscribe to focused slices of Qore signal state instead of broad stream snapshots.
- Added an `enabled` option to `useQoreStream(...)` so React components can keep an idle snapshot without starting network or provider work.
- Added React adapter type and packed-consumer smoke coverage for selector hooks and disabled stream lifecycles.
- Added `npm run check:npm-access` to diagnose local npm authentication and scope/package permissions before release attempts.

## 1.0.1 - 2026-06-02

- Added `stream.events(...)` for typed AI interface event timelines, covering text, tool-call, status, diff, reasoning, artifact, retry, and error style streams without collapsing everything into plain text.
- Added `QoreEventStream.select(type, options?)` so one event stream can project UI-ready substreams such as accumulated text, tool-call timelines, status panels, or streaming diffs while preserving `stream = signal` semantics.
- Expanded runtime, type-level, public API, and packed-package smoke coverage so event streams are validated through both source tests and published tarball consumer paths.
- Updated the README and docs to position provider adapters as transport entrypoints while keeping the runtime moat around `stream -> signal -> UI`.

## 1.0.0 - 2026-05-27

- Declared the `stream = signal` runtime, provider layer, DOM bindings, and release gates stable for the first production-ready Qore release.
- Shipped production debugger support through published JavaScript source maps and declaration maps, with tarball smoke coverage to keep those artifacts stable.
- Locked the npm release path to trusted publishing plus provenance-enabled artifacts so the stable package ships with verifiable supply-chain metadata.

## 1.0.0-rc.3 - 2026-05-27

- Enabled JavaScript source maps and declaration maps in the published package so `@qorejs/qore` is easier to debug in real production integrations.
- Added tarball smoke assertions for `dist/src/index.js.map` and `dist/src/index.d.ts.map` so future RCs cannot silently drop debugger metadata from the npm package.

## 1.0.0-rc.2 - 2026-05-27

- Added regression coverage for the release-tooling surface so rc tag validation and generated GitHub release notes stay correct as the publish flow evolves.
- Upgraded GitHub Actions workflows to `actions/setup-node@v5` to reduce action-runtime churn during the rc period.

## 1.0.0-rc.1 - 2026-05-27

- Added release-channel validation plus automatic npm dist-tag selection so `1.0.0-rc.x` publishes to the `rc` channel instead of accidentally taking over `latest`.
- Added `npm run release:notes` so the current version's changelog section can be reused directly as the GitHub Release body during RC and stable publishes.
- Tightened the release gate again by validating the release version shape inside `npm run release:check`, keeping prereleases on the `rc.N` track before `1.0.0` lands.

## 0.9.0 - 2026-05-26

- Topologically ordered reactive observer flushes by tracking dependency levels through signals, computed values, and effects, preventing duplicate downstream recomputes across diamond-shaped dependency graphs.
- Batched reactive fan-out inside signal and computed notifications so nested observer scheduling cannot re-enter the flush loop with partially updated upstream state.
- Added `createRoot(...)` and `onCleanup(...)` so reactive work can live inside explicit owner trees, letting nested effects and computed values tear down automatically when their parent scope disposes or re-runs.
- Added first-class stream composition primitives through `stream.merge(...)`, `stream.race(...)`, and `stream.retryable(...)`, keeping multi-source orchestration and retry loops inside the same signal-first streaming surface.
- Added `stream.concat(...)` so sequential multi-step flows can stay inside the same stream composition layer instead of hand-rolling source chaining around `startSource(...)`.
- Added `stream.pipe(...)` so completed stage output can feed the next source declaratively, covering retrieval-review-format style chains without leaving Qore's stream runtime.
- Added an explicit release checklist and compatibility matrix for the `1.0.0-rc` phase so supported runtime boundaries, publish gates, and release-blocking failures are documented alongside the code.
- Added migration notes and a provider support matrix so the `0.9.x` to `1.0.0-rc` transition has explicit upgrade guidance and transport coverage documentation.
- Added keyed `list(...)` reconciliation with an append-friendly fast path so chat-style transcripts can grow without rebuilding existing DOM nodes on every new message.
- Added shared SSE retry and reconnection contracts, including configurable provider retry policies plus `Last-Event-ID` resume support so hosted adapters can recover dropped streams without bespoke retry glue.
- Added `stream.switchMap(...)` for prompt churn and agent handoff flows so stale inner streams stop contributing future chunks once a newer source takes over.
- Added `createSSEResponse(...)` so Qore now covers server-side SSE production as well as client-side SSE consumption, including frame encoding hooks and terminal error event support.
- Added provider metadata normalization helpers so OpenAI, Anthropic, OpenRouter, DeepSeek, and Ollama streams can expose a shared usage, finish-reason, and response-id surface without provider-specific parsing in app code.
- Froze the published API surface behind an explicit snapshot check so release candidates fail fast when the `@qorejs/qore` entrypoint changes unintentionally.

## 0.8.1 - 2026-05-22

- Added a stop control to the focused streaming demo so browser regression now verifies an in-flight Qore stream can abort cleanly and recover into the next turn.
- Filled the remaining hosted-provider abort-path gaps so OpenAI and OpenRouter now verify both pre-abort and mid-stream cancellation semantics, matching the existing Anthropic, DeepSeek, and generic adapter coverage.
- Tightened the browser-only DOM boundary so server-side callers now get entrypoint-specific errors like `h() requires a browser-like environment` and `createApp(...).mount(...) requires a browser-like environment`.
- Added package-level runtime smoke coverage for the browser-only DOM boundary so the published tarball preserves the same server-side diagnostics as the source tree.
- Exported `assertCanUseDOM(name?)` so integrations can reuse Qore's browser-boundary guard directly instead of duplicating their own server/runtime checks.
- Expanded package-consumer smoke coverage so the published tarball now verifies `OpenAI` and `Anthropic` adapters alongside the other provider surfaces.

## 0.8.0 - 2026-05-19

- Added a first-class `createDeepSeek(...)` adapter so Qore can stream directly from DeepSeek chat-completions endpoints without custom glue code.
- Hardened provider adapter coverage so Anthropic, DeepSeek, and Ollama now verify pre-abort and mid-stream abort behavior explicitly in the test suite.
- Added an npm publish preflight that checks changelog alignment, npm auth, and whether the target version is already published before the full release flow starts.
- Reworked `npm run publish:npm` to use the new preflight so local autonomous releases fail fast with a clear registry or auth diagnosis.

## 0.7.4 - 2026-05-19

- Hardened provider transport abort propagation so pre-aborted requests fail before `fetch` starts and active SSE or line-stream readers are cancelled promptly when the request signal aborts.
- Added regression coverage for both generic streaming adapters to verify early-abort and mid-stream cancellation behavior without depending on browser `fetch` internals.
- Exported and documented clearer DOM runtime boundary detection through `canUseDOM()`, plus browser-only DOM guard coverage for `h`, `mount`, and `createApp(...).mount(...)`.
- Unified benchmark verification into a shared verifier so the release gate, browser regression suite, and benchmark artifacts all enforce the same performance expectations.
- Added human-readable benchmark summary artifacts to release evidence alongside the raw benchmark JSON output.
- Added first-class local-model provider support through `createOllama(...)` and a reusable line-stream adapter for NDJSON-style transports.

## 0.7.3 - 2026-05-17

- Opted GitHub Actions workflows into the Node 24 JavaScript action runtime ahead of the Node 20 action retirement.
- Added a latest-release badge and quick link to the package README.
- Expanded the browser smoke static-server port range so local checks survive stale preview servers.
- Documented the browser smoke port override knobs for local release checks.
- Reworked response chunk storage so high-frequency streams append chunk history without cloning the full array on every token.
- Added regression coverage for long stream histories and defensive chunk snapshots.

## 0.7.2 - 2026-05-16

- Added npm Trusted Publishing through GitHub Actions so releases can publish without long-lived npm tokens or local OTP prompts.
- Reorganized the source tree into `core`, `dom`, `providers`, and `shared` domains so the framework layout matches its runtime responsibilities.
- Moved compiled JavaScript out of `src` and into `dist`, keeping the source tree TypeScript-first and the published package focused on `dist/src`.
- Reworked the local build, test, and release scripts so they no longer depend on nested `npm` calls and remain stable in lean shell environments.
- Added a reproducible browser benchmark, a dedicated benchmark page, and homepage benchmark surfaces that compare Qore against a snapshot rerender baseline.
- Added npm and GitHub Packages links to the public README surface.
- Added release badges and quick links to make the repository homepage read more like a polished package landing page.
- Added GitHub Actions workflows for release validation and GitHub Packages publishing, including version and changelog checks before publication.
- Added a push and pull-request CI workflow that validates Qore across Node 18, 20, and 22.
- Added Playwright-based browser regression coverage for the homepage, focused demo, and benchmark page, and wired it into CI plus the release pipeline.
- Added browser regression artifacts for CI runs, including viewport screenshots, page-surface screenshots, Playwright reports, and benchmark JSON output.
- Added packed-package runtime smoke coverage so release validation now checks real consumer execution, not just type compatibility.
- Added a dist-sync check so committed build artifacts stay aligned with the TypeScript source before a release ships.
- Hardened the public `QoreStream` lifecycle surface so stream status, errors, chunks, and timestamps are exposed as read-only signals.
- Split stream buffering, lifecycle, and async-iterator internals into focused modules so the stream runtime is easier to extend.
- Added package-level type coverage for stream inference and read-only stream state boundaries.
- Reworked public DOM aliases around standard `Node`, `Element`, `Text`, and `DocumentFragment` types while keeping the previous `Global*` aliases available.
- Added an effect scheduler abstraction with `sync`, `microtask`, `raf`, and custom scheduler modes for high-frequency reactive UI work.
- Enabled `strictNullChecks`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`, then tightened the core runtime, provider layer, demos, and tests to satisfy the stricter compiler guarantees.
- Enabled full TypeScript `strict` mode plus `noImplicitOverride` and `noPropertyAccessFromIndexSignature`, then tightened demos and tests so the stricter surface is enforced end to end.
- Fixed the release workflows so they install dependencies before running checks, and build the package before publishing to GitHub Packages.
- Added contributor-facing project hygiene files, including contributing guidance, security policy, issue templates, a pull request template, and structured GitHub release note categories.

## 0.7.1 - 2026-05-02

- Rewrote the npm-facing README in English so the package page matches the intended public presentation.
- Removed Chinese text from core tests so only demos and documentation are allowed to contain localized copy.

## 0.7.0 - 2026-05-01

- Turned `stream(...)` into a signal-first primitive so streaming values update the UI reactively by default.
- Strengthened the streaming runtime with response isolation, buffered backpressure, pacing, and overflow strategies.
- Added provider adapters for OpenAI, Anthropic, and generic SSE backends.
- Added TypeScript declarations for the public API surface.
- Tightened npm packaging with a smaller tarball, release checks, and publish-ready metadata.
- Reworked the homepage and demos around the core message: `stream = signal`.
