# Qore Release Checklist

This document defines the release bar for `@qorejs/qore`.

## Release Types

### `0.9.x`

Use `0.9.x` for:

- additive stream or provider capabilities
- release gate hardening
- browser regression coverage improvements
- documentation that changes how users should integrate Qore

Do not use `0.9.x` for:

- breaking public API changes without an explicit migration note
- experimental features that are not covered by tests

### `1.0.0-rc.x`

Use release candidates when:

- the public API shape is frozen
- only bug fixes, compatibility clarifications, and documentation corrections remain
- the release check passes on the exact tag candidate

During the RC phase:

- do not add new public APIs unless a release-blocking bug requires it
- do not change stream semantics casually
- do not relax any release gate to get a publish through

### `1.0.0`

Ship `1.0.0` only after at least one RC has stayed stable under the same release checks and no release-blocking issues remain.

## Compatibility Matrix

| Surface | Status | Notes |
| --- | --- | --- |
| Node runtime | Supported | `Node >= 18` |
| Browser runtime | Supported | DOM entrypoints require a browser-like `document` |
| Reactive core | Supported | `signal`, `computed`, `effect`, `batch`, `createRoot`, `onCleanup` |
| Stream runtime | Supported | includes abort, retry, backpressure, async iteration, orchestration helpers |
| Provider adapters | Supported | OpenAI, Anthropic, OpenRouter, DeepSeek, Ollama, generic SSE, generic line-stream |
| Browser DOM layer | Supported | `h`, `text`, `dynamic`, `list`, `mount`, `createApp(...).mount(...)` |
| SSR | Not supported | browser-only DOM layer is explicit in `1.0.x` |
| Hydration | Not supported | post-`1.0.0` area unless fully proven |

## Release Candidate Gate

Every RC must pass all of the following from a clean checkout:

```bash
npm ci
npm run release:check
```

That includes:

- runtime tests
- compile-time contract checks
- browser regression
- benchmark gate
- public API snapshot check
- tarball smoke checks
- `npm pack --dry-run`

## Checklist

Before creating a release tag:

1. Ensure `package.json` and `package-lock.json` versions match.
2. Ensure `CHANGELOG.md` has a heading for that exact version.
3. Ensure `README.md` reflects any new public API.
4. Ensure no uncommitted changes remain.
5. Run `npm run release:check`.
6. Run `npm run publish:preflight` if publishing to npm from a local shell.

Before publishing `1.0.0-rc.x` or `1.0.0`:

1. Confirm the compatibility matrix is still accurate.
2. Confirm the public API snapshot change is intentional if it changed at all.
3. Confirm there are no unresolved release-blocking issues in browser regression or package smoke.
4. Confirm GitHub Actions workflows still match the intended publish path.

## Publish Paths

### npm

- Workflow: `.github/workflows/publish-npm.yml`
- Trigger:
  - manual `workflow_dispatch`
  - GitHub Release `published`

### GitHub Packages

- Workflow: `.github/workflows/publish-github-packages.yml`
- Trigger:
  - manual `workflow_dispatch`
  - GitHub Release `published`

## Release-Blocking Failures

Do not cut an RC or stable release if any of these are failing:

- browser regression on homepage, focused demo, or benchmark page
- package runtime smoke
- package type smoke
- public API snapshot mismatch
- benchmark gate regression
- provider retry / abort / resume contract regressions
