import { expect, test } from '@playwright/test';

function installConsoleGuards(page: import('@playwright/test').Page): string[] {
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

async function expectHealthyPage(page: import('@playwright/test').Page, issues: string[]): Promise<void> {
  await expect(page.locator('body')).not.toBeEmpty();
  await expect(page.locator('[data-nextjs-dialog-overlay], vite-error-overlay, #webpack-dev-server-client-overlay')).toHaveCount(0);
  expect(issues).toEqual([]);
}

test('homepage stream demo and benchmark stay interactive', async ({ page }) => {
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

  await expectHealthyPage(page, issues);
});

test('focused streaming demo supports multi-turn chat', async ({ page }) => {
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

  await expectHealthyPage(page, issues);
});

test('dedicated benchmark page renders both rendering-path cards', async ({ page }) => {
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

  await expectHealthyPage(page, issues);
});
