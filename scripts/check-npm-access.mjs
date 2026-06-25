import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootPackage = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
const reactPackage = JSON.parse(readFileSync(resolve('packages/react/package.json'), 'utf8'));
const packages = [rootPackage.name, reactPackage.name];

function run(command, args) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

const whoami = run('npm', ['whoami', '--registry=https://registry.npmjs.org/']);

if (whoami.status !== 0) {
  console.error('npm-auth=failed');
  console.error((whoami.stderr || whoami.stdout).trim());
  process.exit(1);
}

const user = whoami.stdout.trim();
console.log(`npm-auth=ok user=${user}`);

for (const packageName of packages) {
  const access = run('npm', ['access', 'ls-packages', user, '--json', '--registry=https://registry.npmjs.org/']);

  if (access.status !== 0) {
    console.error(`npm-access=unknown package=${packageName}`);
    console.error((access.stderr || access.stdout).trim());
    process.exit(1);
  }

  const grants = JSON.parse(access.stdout || '{}');
  const permission = grants[packageName] ?? 'none';
  console.log(`npm-access package=${packageName} permission=${permission}`);
}
