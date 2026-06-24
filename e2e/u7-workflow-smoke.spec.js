import { test, expect } from '@playwright/test';

async function clickIfPresent(page, testId) {
  const target = page.getByTestId(testId);
  if (await target.count()) {
    await target.first().click();
    return true;
  }
  return false;
}

test.describe('U7 browser workflow smoke', () => {
  test('app loads and Settings tab is reachable', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Simplified Analysis/i);
    await expect(page.locator('#root')).toBeVisible();
    await page.getByTestId('nav-tab-settings').click();
    await expect(page.getByRole('heading', { name: 'Settings / Defaults' })).toBeVisible();
    await expect(page.getByTestId('settings-contract-hash')).toContainText('engineering-settings-v1');
  });

  test('settings edit marks results stale and changes contract hash', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-tab-settings').click();
    const hashBefore = await page.getByTestId('settings-contract-hash').innerText();
    await page.getByTestId('settings-field-shortDropLimit_ft').fill('2');
    await expect(page.getByTestId('settings-results-stale-banner')).toBeVisible();
    await expect(page.getByTestId('settings-contract-hash')).not.toHaveText(hashBefore);
  });

  test('Reports tab does not show demo report before a calculation', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-tab-reports').click();
    await expect(page.getByTestId('no-active-report')).toBeVisible();
    await expect(page.getByText('No active calculation report is available')).toBeVisible();
  });
});
