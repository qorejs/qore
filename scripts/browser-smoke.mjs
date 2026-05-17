import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const rootPath = fileURLToPath(root);
const buildScript = fileURLToPath(new URL('./build.mjs', import.meta.url));
const serveScript = fileURLToPath(new URL('./serve-static.mjs', import.meta.url));
const playwrightCli = fileURLToPath(new URL('../node_modules/@playwright/test/cli.js', import.meta.url));

const buildRun = spawnSync(process.execPath, [buildScript], {
  stdio: 'inherit',
  cwd: rootPath
});

if (buildRun.status !== 0) {
  process.exit(buildRun.status ?? 1);
}

if (!process.env.CI && process.env.QORE_BROWSER_SMOKE_REQUIRED !== '1') {
  try {
    const { chromium } = await import('@playwright/test');
    const probeBrowser = await chromium.launch({
      channel: process.env.QORE_BROWSER_CHANNEL ?? 'chrome',
      headless: true
    });

    await probeBrowser.close();
  } catch {
    console.warn('Skipping the local browser smoke suite because this shell cannot launch a supported headless browser. CI still enforces the browser regression gate.');
    process.exit(0);
  }
}

async function isPortAvailable(host, port) {
  return new Promise((resolveAvailability) => {
    const probe = createServer();

    probe.once('error', () => resolveAvailability(false));
    probe.once('listening', () => {
      probe.close(() => resolveAvailability(true));
    });

    probe.listen(port, host);
  });
}

async function findAvailablePort(host, startPort, endPort) {
  for (let port = startPort; port <= endPort; port += 1) {
    if (await isPortAvailable(host, port)) {
      return port;
    }
  }

  throw new Error(`No available static server port found between ${startPort} and ${endPort}.`);
}

async function waitForStaticServer(url, serverProcess, readOutput) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`Static server exited before it became ready.\n${readOutput()}`);
    }

    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {
      // The server may still be binding the port; retry briefly before failing.
    }

    await delay(100);
  }

  throw new Error(`Static server did not become ready at ${url}.\n${readOutput()}`);
}

async function createBaseUrl() {
  if (process.env.QORE_TEST_BASE_URL) {
    return {
      baseUrl: process.env.QORE_TEST_BASE_URL,
      cleanup: async () => {}
    };
  }

  const host = '127.0.0.1';
  const startPort = Number(process.env.QORE_STATIC_PORT ?? '4173');
  const endPort = Number(process.env.QORE_STATIC_PORT_END ?? String(startPort + 240));
  const port = await findAvailablePort(host, startPort, endPort);
  const baseUrl = `http://${host}:${port}/`;
  let serverOutput = '';

  const serverProcess = spawn(process.execPath, [serveScript], {
    cwd: rootPath,
    env: {
      ...process.env,
      QORE_STATIC_HOST: host,
      QORE_STATIC_PORT: String(port)
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  serverProcess.stdout.on('data', (chunk) => {
    serverOutput += chunk.toString();
  });
  serverProcess.stderr.on('data', (chunk) => {
    serverOutput += chunk.toString();
  });

  await waitForStaticServer(baseUrl, serverProcess, () => serverOutput);

  return {
    baseUrl,
    cleanup: async () => {
      if (serverProcess.exitCode === null && !serverProcess.killed) {
        serverProcess.kill();
        await delay(50);
      }
    }
  };
}

const smokeTarget = await createBaseUrl();
let exitStatus = 0;

try {
  const browserRun = spawnSync(process.execPath, [playwrightCli, 'test', '--config', 'playwright.config.ts'], {
    cwd: rootPath,
    encoding: 'utf8',
    env: {
      ...process.env,
      QORE_TEST_BASE_URL: smokeTarget.baseUrl,
      QORE_BROWSER_CHANNEL: process.env.QORE_BROWSER_CHANNEL ?? 'chrome'
    }
  });

  process.stdout.write(browserRun.stdout ?? '');
  process.stderr.write(browserRun.stderr ?? '');

  if (browserRun.status !== 0) {
    exitStatus = browserRun.status ?? 1;
  }
} finally {
  await smokeTarget.cleanup();
}

if (exitStatus !== 0) {
  process.exit(exitStatus);
}
