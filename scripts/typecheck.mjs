import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const tscEntry = new URL('./node_modules/typescript/bin/tsc', root);
const reactTsconfig = new URL('./packages/react/tsconfig.json', root);

const result = spawnSync(process.execPath, [fileURLToPath(tscEntry), '-p', 'tsconfig.json', '--noEmit'], {
  stdio: 'inherit'
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const e2eResult = spawnSync(process.execPath, [fileURLToPath(tscEntry), '-p', 'tsconfig.e2e.json', '--noEmit'], {
  stdio: 'inherit'
});

if (e2eResult.status !== 0) {
  process.exit(e2eResult.status ?? 1);
}

const coreBuildForReactResult = spawnSync(process.execPath, [fileURLToPath(tscEntry), '-p', 'tsconfig.json'], {
  stdio: 'inherit'
});

if (coreBuildForReactResult.status !== 0) {
  process.exit(coreBuildForReactResult.status ?? 1);
}

const reactResult = spawnSync(process.execPath, [fileURLToPath(tscEntry), '-p', fileURLToPath(reactTsconfig), '--noEmit'], {
  stdio: 'inherit'
});

if (reactResult.status !== 0) {
  process.exit(reactResult.status ?? 1);
}
