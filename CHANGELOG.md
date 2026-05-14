# Changelog

## Unreleased

- Reorganized the source tree into `core`, `dom`, `providers`, and `shared` domains so the framework layout matches its runtime responsibilities.
- Moved compiled JavaScript out of `src` and into `dist`, keeping the source tree TypeScript-first and the published package focused on `dist/src`.
- Reworked the local build, test, and release scripts so they no longer depend on nested `npm` calls and remain stable in lean shell environments.
- Added a reproducible browser benchmark, a dedicated benchmark page, and homepage benchmark surfaces that compare Qore against a snapshot rerender baseline.
- Added npm and GitHub Packages links to the public README surface.
- Added release badges and quick links to make the repository homepage read more like a polished package landing page.
- Added GitHub Actions workflows for release validation and GitHub Packages publishing, including version and changelog checks before publication.
- Added a push and pull-request CI workflow that validates Qore across Node 18, 20, and 22.
- Added Playwright-based browser regression coverage for the homepage, focused demo, and benchmark page, and wired it into CI plus the release pipeline.
- Added packed-package runtime smoke coverage so release validation now checks real consumer execution, not just type compatibility.
- Added a dist-sync check so committed build artifacts stay aligned with the TypeScript source before a release ships.
- Enabled `strictNullChecks`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`, then tightened the core runtime, provider layer, demos, and tests to satisfy the stricter compiler guarantees.
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
