import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);

const statusRun = spawnSync('git', ['status', '--short', '--', 'dist'], {
  cwd: fileURLToPath(root),
  encoding: 'utf8'
});

if (statusRun.status !== 0) {
  process.stderr.write(statusRun.stderr ?? '');
  process.exit(statusRun.status ?? 1);
}

if (statusRun.stdout.trim().length > 0) {
  console.error('The committed dist artifacts are out of date. Run `npm run build` and commit the updated dist output.');
  process.stderr.write(statusRun.stdout);
  process.exit(1);
}
