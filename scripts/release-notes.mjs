import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const version = packageJson.version;
const helper = fileURLToPath(new URL('./release-version.mjs', import.meta.url));
const helperRun = spawnSync(process.execPath, [helper, '--json', version], { encoding: 'utf8' });

if (helperRun.status !== 0) {
  process.stderr.write(helperRun.stderr || helperRun.stdout);
  process.exit(helperRun.status ?? 1);
}

const { distTag, channel } = JSON.parse(helperRun.stdout.trim());
const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const heading = new RegExp(`^##\\s+${escapedVersion}\\b.*$`, 'm');
const headingMatch = heading.exec(changelog);

if (!headingMatch) {
  throw new Error(`CHANGELOG.md is missing a heading for version ${version}.`);
}

const start = headingMatch.index + headingMatch[0].length;
const rest = changelog.slice(start);
const nextHeadingMatch = rest.match(/^##\s+/m);
const body = (nextHeadingMatch ? rest.slice(0, nextHeadingMatch.index) : rest).trim();

if (!body) {
  throw new Error(`CHANGELOG.md does not contain release notes for version ${version}.`);
}

const installCommand = distTag === 'latest'
  ? 'npm i @qorejs/qore'
  : `npm i @qorejs/qore@${distTag}`;

process.stdout.write([
  `# Qore ${version}`,
  '',
  `Release channel: ${channel}`,
  `Install: \`${installCommand}\``,
  '',
  body
].join('\n'));
