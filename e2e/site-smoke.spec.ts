import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import type { BenchmarkSuite } from '../examples/benchmark-core.js';

function installConsoleGuards(page: Page): string[] {
  const issues: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      issues.push(`console:${message.text()}`);
    }
  });

  page.on('pageerror', (error) => {
    issues.push(`pageerror:${error.message}`);
  });

  return issues;
}

async function expectHealthyPage(page: Page, issues: string[]): Promise<void> {
  await expect(page.locator('body')).not.toBeEmpty();
  await expect(page.locator('[data-nextjs-dialog-overlay], vite-error-overlay, #webpack-dev-server-client-overlay')).toHaveCount(0);
  expect(issues).toEqual([]);
}

async function attachViewportScreenshot(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: false }),
    contentType: 'image/png'
  });
}

async function attachLocatorScreenshot(page: Page, testInfo: TestInfo, testId: string, name: string): Promise<void> {
  await testInfo.attach(name, {
    body: await page.getByTestId(testId).screenshot(),
    contentType: 'image/png'
  });
}

async function readBenchmarkSuite(page: Page): Promise<BenchmarkSuite> {
  const suite = await page.evaluate(() => {
    const benchmarkWindow = window as Window & { __QORE_BENCHMARK__?: BenchmarkSuite };
    return benchmarkWindow.__QORE_BENCHMARK__ ?? null;
  });

  expect(suite).not.toBeNull();
  return suite as BenchmarkSuite;
}

function expectBenchmarkSuiteShape(suite: BenchmarkSuite): void {
  const qore = suite.results.find((result) => result.id === 'qore');
  const snapshot = suite.results.find((result) => result.id === 'snapshot');

  expect(suite.meta.chunkCount).toBeGreaterThan(0);
  expect(suite.meta.characterCount).toBeGreaterThan(0);
  expect(qore).toBeTruthy();
  expect(snapshot).toBeTruthy();
  expect(qore?.averageCharacterDataMutations).toBeGreaterThan(0);
  expect(snapshot?.averageRewrittenBytes).toBeGreaterThan(0);

  expect(qore?.averageRewrittenBytes).toBe(0);
  expect(qore?.averageAddedNodes).toBeLessThan(snapshot?.averageAddedNodes ?? Number.POSITIVE_INFINITY);
  expect(qore?.averageRemovedNodes).toBeLessThanOrEqual(snapshot?.averageRemovedNodes ?? Number.POSITIVE_INFINITY);
  expect(qore?.averageMutationRecords).toBeLessThan(snapshot?.averageMutationRecords ?? Number.POSITIVE_INFINITY);
  expect(qore?.averageDurationMs).toBeLessThan(snapshot?.averageDurationMs ?? Number.POSITIVE_INFINITY);
  expect(qore?.averageCommits).toBe(snapshot?.averageCommits);
}

async function attachBenchmarkSuite(testInfo: TestInfo, suite: BenchmarkSuite): Promise<void> {
  await testInfo.attach('benchmark-suite.json', {
    body: JSON.stringify(suite, null, 2),
    contentType: 'application/json'
  });
}

test('homepage stream demo and benchmark stay interactive', async ({ page }, testInfo) => {
  const issues = installConsoleGuards(page);

  await page.goto('index.html');
  await expect(page).toHaveTitle(/Qore/i);
  await expect(page.getByTestId('home-page')).toBeVisible();
  await expect(page.getByTestId('home-feed')).toBeVisible();

  await expect.poll(async () => (await page.getByTestId('home-stream-status').textContent())?.trim()).toBe('completed');
  await expect(page.getByTestId('home-raw-preview')).toContainText('Stream = Signal');
  await expect(page.getByTestId('home-message-assistant')).toHaveCount(2);

  const userMessagesBefore = await page.getByTestId('home-message-user').count();
  await page.getByTestId('home-preset-2').click();
  await expect(page.getByTestId('home-message-user')).toHaveCount(userMessagesBefore + 1);
  await expect.poll(async () => (await page.getByTestId('home-stream-status').textContent())?.trim()).toBe('completed');
  await expect(page.getByTestId('home-token-river').locator('.token').first()).toBeVisible();

  await page.getByTestId('home-compare-react').click();
  await expect(page.getByTestId('home-compare-card')).toContainText('React + AI SDK');
  await page.getByTestId('home-compare-qore').click();
  await expect(page.getByTestId('home-compare-card')).toContainText('stream = signal');

  await expect(page.getByTestId('home-benchmark-grid')).toBeVisible();
  await expect(page.getByTestId('benchmark-card-qore')).toBeVisible();
  await expect(page.getByTestId('benchmark-card-snapshot')).toBeVisible();
  await page.getByTestId('home-benchmark-run').click();
  await expect(page.getByTestId('home-benchmark-run')).toContainText(/Running|Run Again/);
  await expect(page.getByTestId('home-benchmark-summary')).toBeVisible();

  const homeSuite = await readBenchmarkSuite(page);
  expectBenchmarkSuiteShape(homeSuite);
  await attachBenchmarkSuite(testInfo, homeSuite);

  await attachViewportScreenshot(page, testInfo, 'homepage-viewport.png');
  await attachLocatorScreenshot(page, testInfo, 'home-page', 'homepage-full-surface.png');
  await expectHealthyPage(page, issues);
});

test('focused streaming demo supports multi-turn chat', async ({ page }, testInfo) => {
  const issues = installConsoleGuards(page);

  await page.goto('examples/streaming-response.html');
  await expect(page).toHaveTitle(/Qore/i);
  await expect(page.getByTestId('focused-demo')).toBeVisible();
  await expect(page.getByTestId('focused-feed')).toBeVisible();
  await expect(page.getByTestId('focused-message-user')).toHaveCount(1);
  await expect.poll(async () => (await page.getByTestId('focused-state-assistant').last().textContent())?.trim()).toBe('done');

  const userMessagesBefore = await page.getByTestId('focused-message-user').count();
  await page.getByTestId('focused-input').fill('How does Qore keep a stream reactive?');
  await page.getByTestId('focused-send').click();
  await expect(page.getByTestId('focused-message-user')).toHaveCount(userMessagesBefore + 1);
  await expect.poll(async () => (await page.getByTestId('focused-state-assistant').last().textContent())?.trim()).toBe('done');
  await expect(page.getByTestId('focused-message-assistant').last()).toContainText('Stream = Signal');

  await attachViewportScreenshot(page, testInfo, 'focused-demo-viewport.png');
  await attachLocatorScreenshot(page, testInfo, 'focused-demo', 'focused-demo-surface.png');
  await expectHealthyPage(page, issues);
});

test('dedicated benchmark page renders both rendering-path cards', async ({ page }, testInfo) => {
  const issues = installConsoleGuards(page);

  await page.goto('examples/benchmark.html');
  await expect(page).toHaveTitle(/Benchmark/i);
  await expect(page.getByTestId('benchmark-page')).toBeVisible();
  await expect(page.getByTestId('benchmark-summary')).toBeVisible();
  await expect(page.getByTestId('benchmark-grid')).toBeVisible();
  await expect(page.getByTestId('benchmark-card-qore')).toBeVisible();
  await expect(page.getByTestId('benchmark-card-snapshot')).toBeVisible();

  await page.getByTestId('benchmark-run').click();
  await expect(page.getByTestId('benchmark-summary')).toContainText(/Qore|Run the benchmark/i);

  const suite = await readBenchmarkSuite(page);
  expectBenchmarkSuiteShape(suite);
  await attachBenchmarkSuite(testInfo, suite);
  await attachViewportScreenshot(page, testInfo, 'benchmark-viewport.png');
  await attachLocatorScreenshot(page, testInfo, 'benchmark-page', 'benchmark-page-surface.png');
  await expectHealthyPage(page, issues);
});
