import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const rootPath = fileURLToPath(root);
const buildScript = fileURLToPath(new URL('./build.mjs', import.meta.url));
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

const browserRun = spawnSync(process.execPath, [playwrightCli, 'test', '--config', 'playwright.config.ts'], {
  cwd: rootPath,
  encoding: 'utf8',
  env: {
    ...process.env,
    QORE_TEST_BASE_URL: process.env.QORE_TEST_BASE_URL ?? pathToFileURL(`${rootPath}/`).href,
    QORE_BROWSER_CHANNEL: process.env.QORE_BROWSER_CHANNEL ?? 'chrome'
  }
});

process.stdout.write(browserRun.stdout ?? '');
process.stderr.write(browserRun.stderr ?? '');

if (browserRun.status !== 0) {
  process.exit(browserRun.status ?? 1);
}
