import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const tscEntry = new URL('./node_modules/typescript/bin/tsc', root);

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
