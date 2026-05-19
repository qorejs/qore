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
const artifactSummaryPath = fileURLToPath(new URL('../test-results/benchmark-gate-summary.md', import.meta.url));

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

const benchmarkTarget = await createBaseUrl();

try {
  const verifierModule = await import(new URL('../dist/examples/benchmark-verifier.js', import.meta.url));
  const { formatBenchmarkVerificationMarkdown, verifyBenchmarkSuite } = verifierModule;
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

    if (!suite) {
      throw new Error('Benchmark gate could not read window.__QORE_BENCHMARK__.');
    }

    const verification = verifyBenchmarkSuite(suite);

    mkdirSync(dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      suite,
      verification
    }, null, 2));
    writeFileSync(artifactSummaryPath, formatBenchmarkVerificationMarkdown(suite, verification));

    await context.close();
  } finally {
    await browser.close();
  }
} finally {
  await benchmarkTarget.cleanup();
}
