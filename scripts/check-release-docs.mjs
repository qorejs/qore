import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function assertMatches(content, matchers, message) {
  if (!matchers.some((needle) => content.includes(needle))) {
    throw new Error(message);
  }
}

const readme = read('README.md');
const concepts = read('docs/concepts.md');
const architecture = read('docs/architecture.md');
const api = read('docs/api.md');
const providers = read('docs/providers.md');
const runtime = read('docs/runtime.md');
const comparisons = read('docs/comparisons.md');
const benchmarks = read('docs/benchmarks.md');
const release = read('RELEASE.md');
const migration = read('MIGRATION.md');
const changelog = read('CHANGELOG.md');
const contributing = read('CONTRIBUTING.md');
const roadmap = read('ROADMAP.md');

assertMatches(readme, ['[migration notes](./MIGRATION.md)', '[`MIGRATION.md`](./MIGRATION.md)'], 'README.md must link to MIGRATION.md.');
assertMatches(readme, ['[RELEASE.md](./RELEASE.md)', '[`RELEASE.md`](./RELEASE.md)'], 'README.md must link to RELEASE.md.');
assertMatches(readme, ['## Compatibility Matrix'], 'README.md must include a compatibility matrix section.');
assertMatches(readme, ['## Provider Support Matrix'], 'README.md must include a provider support matrix section.');
assertMatches(readme, ['## Release Checklist'], 'README.md must include a release checklist section.');
assertMatches(readme, ['reactive stream runtime'], 'README.md must state the reactive stream runtime positioning.');
assertMatches(readme, ['./docs/comparisons.md'], 'README.md must link to docs/comparisons.md.');
assertMatches(readme, ['./docs/architecture.md'], 'README.md must link to docs/architecture.md.');
assertMatches(concepts, ['stream = signal'], 'docs/concepts.md must retain the stream = signal concept.');
assertMatches(architecture, ['Provider / AsyncIterable'], 'docs/architecture.md must describe the runtime architecture.');
assertMatches(api, ['stream.switchMap'], 'docs/api.md must include stream orchestration APIs.');
assertMatches(providers, ['Do not put provider API keys in browser code'], 'docs/providers.md must include provider key safety guidance.');
assertMatches(runtime, ['Backpressure'], 'docs/runtime.md must document backpressure.');
assertMatches(comparisons, ['React / Vercel AI SDK'], 'docs/comparisons.md must include the React / Vercel AI SDK comparison.');
assertMatches(benchmarks, ['snapshot-style transcript rewrites'], 'docs/benchmarks.md must describe the benchmark scope precisely.');

assertMatches(release, ['# Qore Release Checklist'], 'RELEASE.md must include the release checklist heading.');
assertMatches(release, ['## Compatibility Matrix'], 'RELEASE.md must include the compatibility matrix.');
assertMatches(release, ['## Release-Blocking Failures', '## Release-blocking failures'], 'RELEASE.md must define release-blocking failures.');
assertMatches(release, ['publish-npm.yml', 'Publish npm Package'], 'RELEASE.md must document the GitHub Actions npm publish workflow.');

assertMatches(migration, ['## `0.7.x` -> `0.8.x`'], 'MIGRATION.md must include the 0.7.x -> 0.8.x section.');
assertMatches(migration, ['## `0.8.x` -> `0.9.0`'], 'MIGRATION.md must include the 0.8.x -> 0.9.0 section.');
assertMatches(migration, ['## `1.0.0-rc`'], 'MIGRATION.md must include the 1.0.0-rc section.');

assertMatches(changelog, ['## 0.9.0'], 'CHANGELOG.md must include the current 0.9.0 heading.');
assertMatches(changelog, ['compatibility matrix'], 'CHANGELOG.md must mention the compatibility matrix additions.');
assertMatches(contributing, ['RELEASE.md'], 'CONTRIBUTING.md must point to RELEASE.md.');
assertMatches(contributing, ['MIGRATION.md'], 'CONTRIBUTING.md must point to MIGRATION.md.');
assertMatches(roadmap, ['### `1.0.0-rc`'], 'ROADMAP.md must retain the 1.0.0-rc milestone.');

console.log('Release documentation surface is consistent.');
