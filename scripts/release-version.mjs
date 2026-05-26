import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const version = process.argv.slice(2).find((argument) => !argument.startsWith('--')) ?? packageJson.version;
const wantsTag = process.argv.includes('--tag');
const wantsJson = process.argv.includes('--json');

const semverPattern = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;
const match = version.match(semverPattern);

if (!match) {
  throw new Error(`Qore release version must be valid semver. Received "${version}".`);
}

const prerelease = match[4] ?? null;

if (prerelease !== null && !/^rc\.\d+$/.test(prerelease)) {
  throw new Error(`Qore prerelease versions must use the rc.N format. Received "${version}".`);
}

const channel = prerelease === null ? 'stable' : 'rc';
const distTag = prerelease === null ? 'latest' : 'rc';
const summary = { version, channel, distTag, prerelease };

if (wantsTag) {
  console.log(distTag);
} else if (wantsJson) {
  console.log(JSON.stringify(summary));
} else {
  console.log(`Validated ${version} as a ${channel} release. npm dist-tag: ${distTag}.`);
}
