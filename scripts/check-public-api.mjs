import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const distEntrypoint = new URL('../dist/src/index.d.ts', import.meta.url);
const snapshotModule = new URL('../dist/test/public-api.snapshot.js', import.meta.url);

function extractPublicExports(source) {
  const exports = new Set();

  for (const match of source.matchAll(/export(?:\s+type)?\s*\{([^}]+)\}/g)) {
    for (const entry of match[1].split(',')) {
      const name = entry.trim().replace(/\s+as\s+.*/, '');

      if (name.length > 0) {
        exports.add(name);
      }
    }
  }

  return [...exports].sort();
}

const source = readFileSync(fileURLToPath(distEntrypoint), 'utf8');
const actual = extractPublicExports(source);
const { PUBLIC_API_SNAPSHOT } = await import(fileURLToPath(snapshotModule));
const expected = [...PUBLIC_API_SNAPSHOT].sort();

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  console.error('Public API surface drifted from the frozen snapshot.');
  console.error('Expected:', expected);
  console.error('Actual:', actual);
  process.exit(1);
}
