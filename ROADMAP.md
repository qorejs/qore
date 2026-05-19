# Qore 1.0 Roadmap

`1.0.0` is the first version that should be safe to adopt in production streaming UI work.

## Release Standard

Before `1.0.0`, Qore must satisfy all of the following:

- Stable reactive core: `signal`, `computed`, `effect`, `batch`
- Stable stream core: `stream`, backpressure, abort, error, async iteration
- Stable DOM bindings for fine-grained streaming updates
- Stable provider story for hosted and self-managed streaming backends
- Stable public types with compile-time contract coverage
- Reproducible browser, package, and performance checks in CI
- Clear semver, changelog, and migration discipline

`1.0.0` is not blocked on every future-facing experiment. It is blocked on runtime correctness, API clarity, and test coverage.

## Core Work

### Runtime

- Harden effect scheduling semantics under `sync`, `microtask`, and `raf`
- Keep all stream lifecycle surfaces read-only from user code
- Continue simplifying stream internals around buffer, lifecycle, and iterator boundaries
- Verify long-running token streams do not stall or leak work on the hot path

### Providers

- Keep `OpenAI`, `Anthropic`, and `Generic SSE` stable
- Add `OpenRouter`
- Add `Ollama`
- Evaluate `Gemini` and `DeepSeek` after the first provider expansion lands

### Rendering

- Keep client-side streaming DOM updates stable
- Define SSR and hydration support explicitly before `1.0.0`
- Do not ship ambiguous partial SSR support that looks complete but is not production-ready

## Test Gates

Every `1.0.0` release candidate must pass:

- Unit coverage for signal, scheduler, response, stream, and provider utilities
- Compile-time contract coverage for public types and read-only boundaries
- Package-consumer smoke tests against the published tarball shape
- Browser regression checks for homepage, focused demo, and benchmark surfaces
- Performance comparisons that catch DOM churn regressions on streaming updates

## Milestones

### `0.8.x`

- Finish runtime hardening
- Expand scheduler and stream failure-path tests
- Lock public readonly contracts with type assertions

### `0.9.0`

- Expand provider support
- Broaden browser regression coverage
- Turn benchmark comparisons into a stricter release signal

### `0.9.5`

- Freeze the public API shape
- Finish starter examples and production integration docs
- Eliminate known `P0` and `P1` issues

### `1.0.0-rc`

- Accept only bug fixes and documentation corrections
- Validate against real integration projects
- Publish migration notes and release checklist

### `1.0.0`

- Ship only after release candidates stay stable
- Keep experimental work clearly separated from the stable runtime surface
