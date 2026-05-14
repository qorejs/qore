import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env['CI']);
const localChannel = process.env['QORE_BROWSER_CHANNEL'] ?? 'chrome';
const baseURL = process.env['QORE_TEST_BASE_URL'] ?? 'http://127.0.0.1:4173/';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: isCI,
  ...(!isCI ? { workers: 1 } : {}),
  timeout: 45_000,
  expect: {
    timeout: 15_000
  },
  reporter: isCI
    ? [['dot'], ['html', { outputFolder: 'playwright-report', open: 'never' }], ['json', { outputFile: 'test-results/browser-smoke.json' }]]
    : [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  preserveOutput: 'always',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  ...(isCI ? {
    webServer: {
      command: 'node ./scripts/serve-static.mjs',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
      timeout: 30_000
    }
  } : {}),
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        ...(!isCI ? { channel: localChannel } : {})
      }
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium',
        ...(!isCI ? { channel: localChannel } : {})
      }
    }
  ]
});
