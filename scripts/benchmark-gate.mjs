import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const rootPath = fileURLToPath(root);
const buildScript = fileURLToPath(new URL('./build.mjs', import.meta.url));
const serveScript = fileURLToPath(new URL('./serve-static.mjs', import.meta.url));
const artifactPath = fileURLToPath(new URL('../test-results/benchmark-gate.json', import.meta.url));

const buildRun = spawnSync(process.execPath, [buildScript], {
  stdio: 'inherit',
  cwd: rootPath
});

if (buildRun.status !== 0) {
  process.exit(buildRun.status ?? 1);
}

if (!process.env.CI && process.env.QORE_BENCHMARK_GATE_REQUIRED !== '1') {
  try {
    const { chromium } = await import('@playwright/test');
    const probeBrowser = await chromium.launch({
      channel: process.env.QORE_BROWSER_CHANNEL ?? 'chrome',
      headless: true
    });

    await probeBrowser.close();
  } catch {
    console.warn('Skipping the local benchmark gate because this shell cannot launch a supported headless browser. CI still enforces the benchmark regression gate.');
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

  throw new Error(`No available benchmark server port found between ${startPort} and ${endPort}.`);
}

async function waitForStaticServer(url, serverProcess, readOutput) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`Static server exited before the benchmark gate became ready.\n${readOutput()}`);
    }

    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {
      // Keep retrying briefly while the local server binds the port.
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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateSuite(suite) {
  const qore = suite?.results?.find((result) => result.id === 'qore');
  const snapshot = suite?.results?.find((result) => result.id === 'snapshot');

  assert(suite?.meta?.chunkCount > 0, 'Benchmark suite must report a positive chunk count.');
  assert(suite?.meta?.characterCount > 0, 'Benchmark suite must report a positive character count.');
  assert(qore, 'Benchmark suite is missing the qore result.');
  assert(snapshot, 'Benchmark suite is missing the snapshot result.');
  assert(qore.averageRewrittenBytes === 0, 'Qore benchmark path must not rewrite HTML bytes.');
  assert(qore.averageAddedNodes < snapshot.averageAddedNodes, 'Qore should add fewer DOM nodes than the snapshot baseline.');
  assert(qore.averageRemovedNodes <= snapshot.averageRemovedNodes, 'Qore should not remove more DOM nodes than the snapshot baseline.');
  assert(qore.averageMutationRecords < snapshot.averageMutationRecords, 'Qore should produce fewer total mutation records than the snapshot baseline.');
  assert(qore.averageDurationMs < snapshot.averageDurationMs, 'Qore should complete faster than the snapshot baseline.');
  assert(qore.averageCommits === snapshot.averageCommits, 'Benchmark variants must process the same number of commits.');
}

const benchmarkTarget = await createBaseUrl();

try {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CI ? {} : { channel: process.env.QORE_BROWSER_CHANNEL ?? 'chrome' })
  });

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();

    await page.goto(new URL('examples/benchmark.html', benchmarkTarget.baseUrl).toString(), {
      waitUntil: 'networkidle'
    });
    await page.getByTestId('benchmark-page').waitFor();
    await page.getByTestId('benchmark-grid').waitFor();

    const suite = await page.evaluate(() => {
      const benchmarkWindow = window;
      return benchmarkWindow.__QORE_BENCHMARK__ ?? null;
    });

    assert(suite, 'Benchmark gate could not read window.__QORE_BENCHMARK__.');
    validateSuite(suite);

    mkdirSync(dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, JSON.stringify(suite, null, 2));

    await context.close();
  } finally {
    await browser.close();
  }
} finally {
  await benchmarkTarget.cleanup();
}
