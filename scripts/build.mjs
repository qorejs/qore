import { rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const dist = new URL('./dist/', root);
const reactDist = new URL('./packages/react/dist/', root);
const tscEntry = new URL('./node_modules/typescript/bin/tsc', root);
const reactTsconfig = new URL('./packages/react/tsconfig.build.json', root);

rmSync(dist, { recursive: true, force: true });
rmSync(reactDist, { recursive: true, force: true });

const tsc = spawnSync(process.execPath, [fileURLToPath(tscEntry), '-p', 'tsconfig.json'], {
  stdio: 'inherit'
});

if (tsc.status !== 0) {
  process.exit(tsc.status ?? 1);
}

const reactTsc = spawnSync(process.execPath, [fileURLToPath(tscEntry), '-p', fileURLToPath(reactTsconfig)], {
  stdio: 'inherit'
});

if (reactTsc.status !== 0) {
  process.exit(reactTsc.status ?? 1);
}
