import { test, expect } from '@playwright/test';

test.describe('U2 engineering settings contract', () => {
  test('settings changes mark results stale and hydrate GC3D / Pipe Rack views', async ({ page }) => {
    await page.goto('/');

    await page.getByTestId('nav-tab-settings').click();
    await expect(page.getByText('Settings / Defaults')).toBeVisible();
    await expect(page.getByTestId('settings-contract-hash')).toContainText('engineering-settings-v1');

    const initialHash = await page.getByTestId('settings-contract-hash').innerText();
    const shortDropField = page.getByTestId('settings-field-shortDropLimit_ft');
    await shortDropField.fill('2');
    await expect(page.getByTestId('settings-results-stale-banner')).toBeVisible();
    await expect(page.getByTestId('settings-contract-hash')).not.toHaveText(initialHash);

    await page.getByTestId('nav-tab-3d-analysis').click();
    await expect(page.getByTestId('gc3d-settings-hash')).toBeVisible();
    await expect(page.getByTestId('gc3d-settings-hash')).toContainText('fnv1a32-');

    await page.getByTestId('nav-tab-simpAnalysis').click();
    await page.getByText('Pipe Rack Calc').click();
    await expect(page.getByTestId('piperack-settings-hash')).toBeVisible();
    await expect(page.getByTestId('piperack-settings-hash')).toContainText('fnv1a32-');
  });
});
