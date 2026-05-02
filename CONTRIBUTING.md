# Contributing to Qore

Thanks for contributing to Qore.

Qore is centered on one core idea: `stream = signal`. The best contributions make that idea clearer, stronger, or easier to adopt.

## Principles

- Keep the core focused on streaming response.
- Prefer smaller, sharper APIs over broader abstraction.
- Treat fine-grained UI updates as a feature, not an implementation detail.
- Keep demos and docs aligned with the runtime story.

## Development Setup

```bash
git clone git@github.com:qorejs/qore.git
cd qore
npm test
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173/`.

## Project Layout

- `src/`: runtime, adapters, and DOM primitives
- `examples/`: homepage and focused demos
- `test/`: runtime and adapter coverage
- `.github/workflows/`: release and publishing automation

## Before Opening a Pull Request

- Run `npm test`
- Keep commit messages in English
- Avoid adding Chinese text outside demos and documentation
- Add or update tests for runtime behavior changes
- Make sure any new API strengthens the `stream = signal` story

## Release Notes

If your change affects users, update `CHANGELOG.md` under `Unreleased`.

## Releases

The release flow is intentionally strict:

- `Release Check` verifies version, changelog, tests, and tarball shape
- `Publish GitHub Packages` publishes the package to GitHub Packages after the same validation passes
- npm releases should continue to use the checked package state from the repository root

## Good First Contributions

- Tighten streaming ergonomics
- Improve adapter consistency
- Expand tests around lifecycle and backpressure
- Clarify docs with shorter, sharper examples
