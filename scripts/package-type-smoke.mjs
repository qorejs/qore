import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const rootPath = fileURLToPath(root);
const buildScript = fileURLToPath(new URL('./build.mjs', import.meta.url));
const tscEntry = fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url));
const fixturePath = fileURLToPath(new URL('./fixtures/package-consumer.ts', import.meta.url));
const npmCli = process.env.npm_execpath;

if (!npmCli) {
  console.error('npm_execpath is not available, so the package type smoke test cannot run.');
  process.exit(1);
}

const tempDir = mkdtempSync(join(tmpdir(), 'qore-package-types-'));
let tarballPath = null;

try {
  const buildRun = spawnSync(process.execPath, [buildScript], {
    cwd: rootPath,
    stdio: 'inherit'
  });

  if (buildRun.status !== 0) {
    process.exit(buildRun.status ?? 1);
  }

  const packRun = spawnSync(process.execPath, [npmCli, 'pack', '--json'], {
    cwd: rootPath,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit']
  });

  if (packRun.status !== 0) {
    process.exit(packRun.status ?? 1);
  }

  const [packInfo] = JSON.parse(packRun.stdout);
  tarballPath = join(rootPath, packInfo.filename);

  writeFileSync(join(tempDir, 'package.json'), JSON.stringify({
    name: 'qore-package-type-smoke',
    private: true,
    type: 'module'
  }, null, 2));

  writeFileSync(join(tempDir, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      lib: ['ES2022', 'DOM'],
      strict: true,
      noEmit: true,
      skipLibCheck: false
    },
    include: ['./package-consumer.ts']
  }, null, 2));

  writeFileSync(join(tempDir, 'package-consumer.ts'), readFileSync(fixturePath, 'utf8'));

  const installRun = spawnSync(process.execPath, [npmCli, 'install', '--no-package-lock', '--ignore-scripts', tarballPath], {
    cwd: tempDir,
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

  const typecheckRun = spawnSync(process.execPath, [tscEntry, '-p', join(tempDir, 'tsconfig.json')], {
    cwd: tempDir,
    stdio: 'inherit'
  });

  if (typecheckRun.status !== 0) {
    process.exit(typecheckRun.status ?? 1);
  }
} finally {
  if (tarballPath) {
    rmSync(tarballPath, { force: true });
  }

  rmSync(tempDir, { recursive: true, force: true });
}
