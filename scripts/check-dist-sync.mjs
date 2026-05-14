import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const rootPath = fileURLToPath(root);
const distPath = join(rootPath, 'dist');
const buildScript = fileURLToPath(new URL('./build.mjs', import.meta.url));

function listFiles(directoryPath) {
  if (!existsSync(directoryPath)) {
    return [];
  }

  const files = [];

  for (const entry of readdirSync(directoryPath)) {
    const entryPath = join(directoryPath, entry);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) {
      files.push(...listFiles(entryPath));
      continue;
    }

    files.push(entryPath);
  }

  return files.sort();
}

function hashDirectory(directoryPath) {
  const hash = createHash('sha256');

  for (const filePath of listFiles(directoryPath)) {
    hash.update(relative(directoryPath, filePath));
    hash.update('\0');
    hash.update(readFileSync(filePath));
    hash.update('\0');
  }

  return hash.digest('hex');
}

const before = hashDirectory(distPath);
const buildRun = spawnSync(process.execPath, [buildScript], {
  cwd: rootPath,
  stdio: 'inherit'
});

if (buildRun.status !== 0) {
  process.exit(buildRun.status ?? 1);
}

const after = hashDirectory(distPath);

if (before !== after) {
  console.error('The dist artifacts were stale. Run `npm run build` and commit the updated dist output before shipping.');
  process.exit(1);
}
