# Qore Migration Notes

This document tracks the public migration surface for `@qorejs/qore`.

## `0.7.x` -> `0.8.x`

### Runtime and Packaging

- The package is now TypeScript-first in `src/` and publishes compiled output from `dist/src`.
- The public DOM aliases were normalized around standard DOM types while keeping legacy `Global*` aliases available.
- The release pipeline now treats package smoke, browser regression, and dist-sync checks as release gates.

### Stream Runtime

- `QoreStream` lifecycle state is exposed through read-only signals.
- `status`, `error`, `chunks`, `startedAt`, and `finishedAt` should now be treated as immutable views.
- If user code was mutating these fields directly, it must move to runtime APIs like `abort()` or a new stream instance.

### Scheduling

- `effect(...)` scheduling is now an explicit part of the runtime surface.
- Supported scheduler modes:
  - `sync`
  - `microtask`
  - `raf`
  - custom scheduler function

## `0.8.x` -> `0.9.0`

### New Stable Runtime Surface

The following public APIs were added and are intended to remain on the stable track:

- `createRoot(...)`
- `onCleanup(...)`
- `createSSEResponse(...)`
- `collectProviderMetadata(...)`
- `mergeProviderMetadata(...)`
- `extractOpenAIMetadata(...)`
- `extractAnthropicMetadata(...)`
- `extractOpenRouterMetadata(...)`
- `extractDeepSeekMetadata(...)`
- `extractOllamaMetadata(...)`

### Stream Composition

Qore now exposes a broader orchestration layer:

- `stream.merge(...)`
- `stream.concat(...)`
- `stream.pipe(...)`
- `stream.race(...)`
- `stream.retryable(...)`
- `stream.switchMap(...)`

If earlier code implemented these patterns manually around `for await...of` loops, it can usually simplify into the built-in stream helpers.

### Browser Boundary

The DOM layer is explicitly browser-only in the `0.9.x` line.

- `signal`, `stream`, providers, and server helpers work in Node and the browser
- `h`, `text`, `dynamic`, `list`, `mount`, and `createApp(...).mount(...)` require a browser-like `document`
- `assertCanUseDOM(...)` and `canUseDOM()` are the supported guards for branching

### SSR and Hydration

There is no stable SSR or hydration support in `0.9.x`.

If an integration previously assumed partial SSR support, it should treat that assumption as unsupported and move DOM entrypoints behind a browser/runtime guard.

## `1.0.0-rc`

Expected RC rules:

- no casual public API additions
- no silent semantics changes in stream lifecycle behavior
- no ambiguous SSR or hydration claims
- any public API surface change must update the frozen API snapshot and release notes intentionally
