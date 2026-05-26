import { existsSync, readFileSync } from 'node:fs';

const registry = process.env.QORE_NPM_REGISTRY ?? 'https://registry.npmjs.org/';
const commandTimeoutMs = Number.parseInt(process.env.QORE_PUBLISH_TIMEOUT_MS ?? '15000', 10);
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const packageName = packageJson.name;
const version = packageJson.version;
const releaseChannel = version.includes('-rc.') ? 'rc' : 'stable';
const npmDistTag = releaseChannel === 'rc' ? 'rc' : 'latest';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function normalizeRegistryUrl(value) {
  return value.endsWith('/') ? value : `${value}/`;
}

function createTimeoutSignal(ms, message) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(message)), ms);
  return {
    signal: controller.signal,
    clear() {
      clearTimeout(timer);
    }
  };
}

function readNpmRcFile(path) {
  if (!path || !existsSync(path)) {
    return '';
  }

  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

function readAuthToken(registryUrl) {
  const normalizedRegistry = normalizeRegistryUrl(registryUrl);
  const tokenFromEnv = process.env.NODE_AUTH_TOKEN || process.env.NPM_TOKEN;

  if (tokenFromEnv) {
    return tokenFromEnv;
  }

  const npmrc = [
    readNpmRcFile(new URL('../.npmrc', import.meta.url)),
    readNpmRcFile(`${process.env.HOME ?? ''}/.npmrc`)
  ].filter(Boolean).join('\n');
  const hostKey = normalizedRegistry.replace(/^https?:/, '');
  const tokenPattern = new RegExp(`^${hostKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:_authToken=(.+)$`, 'm');
  const match = npmrc.match(tokenPattern);

  return match?.[1]?.trim() ?? null;
}

async function fetchJson(url, init, timeoutMessage) {
  const timeout = createTimeoutSignal(commandTimeoutMs, timeoutMessage);

  try {
    let response;

    try {
      response = await fetch(url, {
        ...init,
        signal: timeout.signal
      });
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : String(error);
      fail([
        `Qore npm publish preflight could not reach ${url}.`,
        `Network error: ${message}`
      ].join('\n'));
    }

    const contentType = response.headers.get('content-type') ?? '';
    const body = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : await response.text().catch(() => '');

    return {
      response,
      body
    };
  } finally {
    timeout.clear();
  }
}

const changelogHeading = new RegExp(`^##\\s+${version}\\b`, 'm');

if (!changelogHeading.test(changelog)) {
  fail(`CHANGELOG.md is missing a heading for version ${version}.`);
}

if (!process.env.CI && process.env.QORE_SKIP_NPM_AUTH_CHECK !== '1') {
  const token = readAuthToken(registry);

  if (!token) {
    fail([
      `Qore npm publish preflight could not find an auth token for ${registry}.`,
      'Run `npm login` again or add a valid token to ~/.npmrc before publishing.'
    ].join('\n'));
  }

  const whoamiUrl = new URL('-/whoami', normalizeRegistryUrl(registry)).toString();
  const { response, body } = await fetchJson(
    whoamiUrl,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    `Qore npm publish preflight timed out after ${commandTimeoutMs}ms while checking npm auth against ${registry}.`
  );

  if (!response.ok) {
    fail([
      `Qore npm publish preflight could not authenticate against ${registry}.`,
      'Run `npm login` again or refresh the auth token in ~/.npmrc before publishing.',
      typeof body === 'string' ? body : JSON.stringify(body)
    ].join('\n'));
  }
}

const packageUrl = new URL(packageName.replace('/', '%2f'), normalizeRegistryUrl(registry)).toString();
const { response: versionResponse, body: versionBody } = await fetchJson(
  packageUrl,
  {},
  `Qore npm publish preflight timed out after ${commandTimeoutMs}ms while checking whether ${packageName}@${version} exists on ${registry}.`
);

if (versionResponse.status === 404) {
  console.log(`Preflight ready: ${packageName}@${version} is not on ${registry} yet. npm dist-tag: ${npmDistTag}.`);
  process.exit(0);
}

if (!versionResponse.ok) {
  fail([
    `Qore npm publish preflight could not verify whether ${packageName}@${version} already exists on ${registry}.`,
    typeof versionBody === 'string' ? versionBody : JSON.stringify(versionBody)
  ].join('\n'));
}

const publishedVersions = versionBody?.versions ?? {};

if (publishedVersions[version]) {
  fail(`${packageName}@${version} is already published on ${registry}. Bump package.json before publishing again.`);
}

console.log(`Preflight ready: ${packageName}@${version} is not on ${registry} yet. npm dist-tag: ${npmDistTag}.`);
