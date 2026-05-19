import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const rootPath = fileURLToPath(root);
const npmCli = process.env.npm_execpath;
const preflightScript = fileURLToPath(new URL('./publish-preflight.mjs', import.meta.url));

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!npmCli) {
  fail('npm_execpath is not available, so Qore cannot launch npm publish automatically.');
}

const preflight = spawnSync(process.execPath, [preflightScript], {
  cwd: rootPath,
  stdio: 'inherit'
});

if (preflight.status !== 0) {
  process.exit(preflight.status ?? 1);
}

const publish = spawnSync(process.execPath, [npmCli, 'publish', '--access', 'public'], {
  cwd: rootPath,
  stdio: 'inherit'
});

if (publish.status !== 0) {
  process.exit(publish.status ?? 1);
}
