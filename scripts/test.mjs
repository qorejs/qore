import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const buildScript = new URL('./build.mjs', import.meta.url);
const testsDir = new URL('../dist/test/', import.meta.url);

const build = spawnSync(process.execPath, [fileURLToPath(buildScript)], {
  stdio: 'inherit'
});

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const testFiles = readdirSync(testsDir)
  .filter((file) => file.endsWith('.test.js'))
  .sort()
  .map((file) => fileURLToPath(new URL(`./${file}`, testsDir)));

const testRun = spawnSync(process.execPath, ['--test', ...testFiles], {
  stdio: 'inherit',
  cwd: fileURLToPath(root)
});

if (testRun.status !== 0) {
  process.exit(testRun.status ?? 1);
}
