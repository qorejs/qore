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
