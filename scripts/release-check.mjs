import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const typecheckScript = new URL('./typecheck.mjs', import.meta.url);
const testScript = new URL('./test.mjs', import.meta.url);
const browserSmokeScript = new URL('./browser-smoke.mjs', import.meta.url);
const benchmarkGateScript = new URL('./benchmark-gate.mjs', import.meta.url);
const publicApiScript = new URL('./check-public-api.mjs', import.meta.url);
const releaseDocsScript = new URL('./check-release-docs.mjs', import.meta.url);
const distSyncScript = new URL('./check-dist-sync.mjs', import.meta.url);
const packageTypeSmokeScript = new URL('./package-type-smoke.mjs', import.meta.url);
const packageRuntimeSmokeScript = new URL('./package-runtime-smoke.mjs', import.meta.url);

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

const browserSmokeRun = spawnSync(process.execPath, [fileURLToPath(browserSmokeScript)], {
  stdio: 'inherit',
  cwd: fileURLToPath(root)
});

if (browserSmokeRun.status !== 0) {
  process.exit(browserSmokeRun.status ?? 1);
}

const benchmarkGateRun = spawnSync(process.execPath, [fileURLToPath(benchmarkGateScript)], {
  stdio: 'inherit',
  cwd: fileURLToPath(root)
});

if (benchmarkGateRun.status !== 0) {
  process.exit(benchmarkGateRun.status ?? 1);
}

const publicApiRun = spawnSync(process.execPath, [fileURLToPath(publicApiScript)], {
  stdio: 'inherit',
  cwd: fileURLToPath(root)
});

if (publicApiRun.status !== 0) {
  process.exit(publicApiRun.status ?? 1);
}

const releaseDocsRun = spawnSync(process.execPath, [fileURLToPath(releaseDocsScript)], {
  stdio: 'inherit',
  cwd: fileURLToPath(root)
});

if (releaseDocsRun.status !== 0) {
  process.exit(releaseDocsRun.status ?? 1);
}

const distSyncRun = spawnSync(process.execPath, [fileURLToPath(distSyncScript)], {
  stdio: 'inherit',
  cwd: fileURLToPath(root)
});

if (distSyncRun.status !== 0) {
  process.exit(distSyncRun.status ?? 1);
}

const packageTypeSmokeRun = spawnSync(process.execPath, [fileURLToPath(packageTypeSmokeScript)], {
  stdio: 'inherit',
  cwd: fileURLToPath(root)
});

if (packageTypeSmokeRun.status !== 0) {
  process.exit(packageTypeSmokeRun.status ?? 1);
}

const packageRuntimeSmokeRun = spawnSync(process.execPath, [fileURLToPath(packageRuntimeSmokeScript)], {
  stdio: 'inherit',
  cwd: fileURLToPath(root)
});

if (packageRuntimeSmokeRun.status !== 0) {
  process.exit(packageRuntimeSmokeRun.status ?? 1);
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
