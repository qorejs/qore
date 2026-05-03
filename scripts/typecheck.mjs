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
