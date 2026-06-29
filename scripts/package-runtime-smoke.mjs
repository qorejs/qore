import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const rootPath = fileURLToPath(root);
const buildScript = fileURLToPath(new URL('./build.mjs', import.meta.url));
const fixturePath = fileURLToPath(new URL('./fixtures/package-runtime-consumer.mjs', import.meta.url));
const npmCli = process.env.npm_execpath;

if (!npmCli) {
  console.error('npm_execpath is not available, so the package runtime smoke test cannot run.');
  process.exit(1);
}

const tempDir = mkdtempSync(join(tmpdir(), 'qore-package-runtime-'));
let tarballPath = null;
const npmCache = join(tempDir, '.npm-cache');

try {
  const buildRun = spawnSync(process.execPath, [buildScript], {
    cwd: rootPath,
    env: { ...process.env, npm_config_cache: npmCache },
    stdio: 'inherit'
  });

  if (buildRun.status !== 0) {
    process.exit(buildRun.status ?? 1);
  }

  const packRun = spawnSync(process.execPath, [npmCli, 'pack', '--json'], {
    cwd: rootPath,
    env: { ...process.env, npm_config_cache: npmCache },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit']
  });

  if (packRun.status !== 0) {
    process.exit(packRun.status ?? 1);
  }

  const [packInfo] = JSON.parse(packRun.stdout);
  tarballPath = join(rootPath, packInfo.filename);

  writeFileSync(join(tempDir, 'package.json'), JSON.stringify({
    name: 'qore-package-runtime-smoke',
    private: true,
    type: 'module'
  }, null, 2));

  writeFileSync(join(tempDir, 'package-runtime-consumer.mjs'), readFileSync(fixturePath, 'utf8'));

  const installRun = spawnSync(process.execPath, [npmCli, 'install', '--no-package-lock', '--ignore-scripts', tarballPath], {
    cwd: tempDir,
    env: { ...process.env, npm_config_cache: npmCache },
    stdio: 'inherit'
  });

  if (installRun.status !== 0) {
    process.exit(installRun.status ?? 1);
  }

  const installedRoot = join(tempDir, 'node_modules', '@qorejs', 'qore');

  for (const requiredFile of ['dist/src/index.js.map', 'dist/src/index.d.ts.map']) {
    if (!existsSync(join(installedRoot, requiredFile))) {
      console.error(`Published tarball is missing ${requiredFile}.`);
      process.exit(1);
    }
  }

  const runtimeRun = spawnSync(process.execPath, [join(tempDir, 'package-runtime-consumer.mjs')], {
    cwd: tempDir,
    env: { ...process.env, npm_config_cache: npmCache },
    stdio: 'inherit'
  });

  if (runtimeRun.status !== 0) {
    process.exit(runtimeRun.status ?? 1);
  }
} finally {
  if (tarballPath) {
    rmSync(tarballPath, { force: true });
  }

  rmSync(tempDir, { recursive: true, force: true });
}
