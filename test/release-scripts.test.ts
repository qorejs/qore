import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const root = process.cwd();
const releaseVersionScript = resolve(root, 'scripts/release-version.mjs');
const releaseNotesScript = resolve(root, 'scripts/release-notes.mjs');
const packageVersion = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version as string;

function runNodeScript(script: string, args: string[] = []): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: 'utf8'
  });
}

function readOutput(result: ReturnType<typeof spawnSync>): string {
  return `${typeof result.stdout === 'string' ? result.stdout : ''}${typeof result.stderr === 'string' ? result.stderr : ''}`;
}

function readStdout(result: ReturnType<typeof spawnSync>): string {
  return typeof result.stdout === 'string' ? result.stdout : '';
}

test('release-version maps stable and rc versions to the expected npm dist-tags', () => {
  const stable = runNodeScript(releaseVersionScript, ['0.9.0', '--json']);
  assert.equal(stable.status, 0, readOutput(stable));
  assert.deepEqual(JSON.parse(readStdout(stable).trim()), {
    version: '0.9.0',
    channel: 'stable',
    distTag: 'latest',
    prerelease: null
  });

  const rc = runNodeScript(releaseVersionScript, ['1.0.0-rc.1', '--json']);
  assert.equal(rc.status, 0, readOutput(rc));
  assert.deepEqual(JSON.parse(readStdout(rc).trim()), {
    version: '1.0.0-rc.1',
    channel: 'rc',
    distTag: 'rc',
    prerelease: 'rc.1'
  });
});

test('release-version rejects unsupported prerelease channels', () => {
  const invalid = runNodeScript(releaseVersionScript, ['1.0.0-beta.1']);
  assert.notEqual(invalid.status, 0);
  assert.match(readOutput(invalid), /must use the rc\.N format/);
});

test('release-notes renders the current changelog section with the matching install command', () => {
  const result = runNodeScript(releaseNotesScript);
  assert.equal(result.status, 0, readOutput(result));
  const stdout = readStdout(result);
  assert.match(stdout, new RegExp(`# Qore ${packageVersion.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}`));
  assert.match(stdout, /Release channel: rc/);
  assert.match(stdout, /Install: `npm i @qorejs\/qore@rc`/);
  const lines = stdout.trim().split('\n');
  assert.ok(lines.length >= 6, 'release notes should include at least one changelog bullet');
  assert.ok(lines.slice(4).some((line) => line.startsWith('- ')), 'release notes should include changelog bullets');
});
