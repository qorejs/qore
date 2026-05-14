import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const typecheckScript = new URL('./typecheck.mjs', import.meta.url);
const testScript = new URL('./test.mjs', import.meta.url);
const packageTypeSmokeScript = new URL('./package-type-smoke.mjs', import.meta.url);

const typecheckRun = spawnSync(process.execPath, [fileURLToPath(typecheckScript)], {
  stdio: 'inherit',
  cwd: fileURLToPath(root)
});

if (typecheckRun.status !== 0) {
  process.exit(typecheckRun.status ?? 1);
}

const testRun = spawnSync(process.execPath, [fileURLToPath(testScript)], {
  stdio: 'inherit',
  cwd: fileURLToPath(root)
});

if (testRun.status !== 0) {
  process.exit(testRun.status ?? 1);
}

const packageTypeSmokeRun = spawnSync(process.execPath, [fileURLToPath(packageTypeSmokeScript)], {
  stdio: 'inherit',
  cwd: fileURLToPath(root)
});

if (packageTypeSmokeRun.status !== 0) {
  process.exit(packageTypeSmokeRun.status ?? 1);
}

const npmCli = process.env.npm_execpath;

if (!npmCli) {
  console.error('npm_execpath is not available, so release check cannot run npm pack --dry-run.');
  process.exit(1);
}

const packRun = spawnSync(process.execPath, [npmCli, 'pack', '--dry-run'], {
  stdio: 'inherit',
  cwd: fileURLToPath(root)
});

if (packRun.status !== 0) {
  process.exit(packRun.status ?? 1);
}
