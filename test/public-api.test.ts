import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { PUBLIC_API_SNAPSHOT } from './public-api.snapshot.js';

function extractPublicExports(source: string): string[] {
  const exports = new Set<string>();

  for (const match of source.matchAll(/export(?:\s+type)?\s*\{([^}]+)\}/g)) {
    const group = match[1];

    if (!group) {
      continue;
    }

    for (const entry of group.split(',')) {
      const name = entry.trim().replace(/\s+as\s+.*/, '');

      if (name.length > 0) {
        exports.add(name);
      }
    }
  }

  return [...exports].sort();
}

test('published type entrypoint matches the frozen public API snapshot', async () => {
  const entrypoint = resolve(process.cwd(), 'dist/src/index.d.ts');
  const source = await readFile(entrypoint, 'utf8');
  const actual = extractPublicExports(source);
  const expected = [...PUBLIC_API_SNAPSHOT].sort();

  assert.deepEqual(actual, expected);
});
