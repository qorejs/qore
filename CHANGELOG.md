# Changelog

## Unreleased

- Added npm and GitHub Packages links to the public README surface.
- Added release badges and quick links to make the repository homepage read more like a polished package landing page.
- Added GitHub Actions workflows for release validation and GitHub Packages publishing, including version and changelog checks before publication.
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
