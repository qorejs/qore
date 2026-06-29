import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const reactPackage = fileURLToPath(new URL('../packages/react/', import.meta.url));
const buildScript = fileURLToPath(new URL('./build.mjs', import.meta.url));
const tempRoot = join(tmpdir(), `qore-react-smoke-${Date.now()}`);
const npmCache = join(tempRoot, '.npm-cache');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, npm_config_cache: npmCache },
    stdio: 'inherit',
    ...options
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return result;
}

function pack(cwd) {
  const result = spawnSync('npm', ['pack', '--json', '--pack-destination', tempRoot], {
    cwd,
    env: { ...process.env, npm_config_cache: npmCache },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit']
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  const [entry] = JSON.parse(result.stdout);
  if (!entry?.filename) {
    throw new Error(`npm pack did not return a filename for ${cwd}.`);
  }

  return resolve(tempRoot, entry.filename);
}

rmSync(tempRoot, { recursive: true, force: true });
mkdirSync(tempRoot, { recursive: true });

run(process.execPath, [buildScript]);

if (!existsSync(new URL('../packages/react/dist/index.js', import.meta.url))) {
  throw new Error('React adapter dist/index.js was not built.');
}

run('npm', ['pack', '--dry-run'], { cwd: reactPackage });

const qoreTarball = pack(root);
const reactTarball = pack(reactPackage);

writeFileSync(join(tempRoot, 'package.json'), JSON.stringify({
  type: 'module',
  private: true,
  dependencies: {
    '@qorejs/qore': `file:${qoreTarball}`,
    '@qorejs/react': `file:${reactTarball}`,
    react: '^19.2.7',
    'react-dom': '^19.2.7'
  },
  devDependencies: {
    '@types/react': '^19.2.17',
    '@types/react-dom': '^19.2.3',
    '@types/node': '^25.6.0',
    tsx: '^4.22.4',
    typescript: '^6.0.3'
  }
}, null, 2));

writeFileSync(join(tempRoot, 'tsconfig.json'), JSON.stringify({
  compilerOptions: {
    target: 'ES2022',
    module: 'NodeNext',
    moduleResolution: 'NodeNext',
    lib: ['ES2022', 'DOM'],
    strict: true,
    jsx: 'react-jsx',
    skipLibCheck: true,
    types: ['node', 'react', 'react-dom']
  },
  include: ['smoke.tsx']
}, null, 2));

writeFileSync(join(tempRoot, 'smoke.tsx'), `import { signal, stream } from '@qorejs/qore';
import { useQoreSignal, useQoreSignalSelector, useQoreStream, useQoreStreamSnapshot } from '@qorejs/react';
import { renderToString } from 'react-dom/server';

const count = signal(1);
const answer = stream<string>(['Qore']);

function App() {
  const currentCount = useQoreSignal(count);
  const countLabel = useQoreSignalSelector(count, (value) => value > 0 ? 'positive' : 'empty');
  const snapshot = useQoreStreamSnapshot(answer, { initialValue: '' });
  const disabled = useQoreStream(() => stream(['skip']), [], { initialValue: '', enabled: false });

  return <main data-disabled={disabled.status} data-label={countLabel} data-status={snapshot.status}>{currentCount}:{snapshot.value}</main>;
}

const html = renderToString(<App />);
const normalized = html.replace(/<!--.*?-->/g, '');

if (!normalized.includes('1:') || !html.includes('data-status=\"idle\"')) {
  throw new Error('React adapter smoke render produced unexpected HTML: ' + html);
}
`);

run('npm', ['install', '--ignore-scripts'], { cwd: tempRoot });
run('npx', ['tsc', '-p', 'tsconfig.json', '--noEmit'], { cwd: tempRoot });
run('node', ['--import', 'tsx', 'smoke.tsx'], { cwd: tempRoot });

rmSync(tempRoot, { recursive: true, force: true });
console.log('react-package-smoke-ok');
