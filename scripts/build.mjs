import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const dist = new URL('./dist/', root);
const tscEntry = new URL('./node_modules/typescript/bin/tsc', root);

rmSync(dist, { recursive: true, force: true });

const tsc = spawnSync(process.execPath, [fileURLToPath(tscEntry), '-p', 'tsconfig.json'], {
  stdio: 'inherit'
});

if (tsc.status !== 0) {
  process.exit(tsc.status ?? 1);
}

mkdirSync(new URL('./src/', dist), { recursive: true });
cpSync(new URL('./src/index.d.ts', root), new URL('./src/index.d.ts', dist));
