import { test, expect } from '@playwright/test';

test.describe('Consolidated Analysis Workspace browser smoke', () => {
  test('loads the three-panel shell without legacy top navigation', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Simplified Analysis/i);
    await expect(page.locator('[data-panel="tree"]')).toBeVisible();
    await expect(page.locator('[data-panel="viewport"]')).toBeVisible();
    await expect(page.locator('[data-panel="properties"]')).toBeVisible();
    await expect(page.locator('nav')).toHaveCount(0);
  });

  test('tree selection updates viewport and properties through EventBus', async ({ page }) => {
    await page.goto('/');

    await page.locator('[data-entity-id="PIPE-102"]').click();

    await expect(page.locator('[data-role="viewport-selection"]')).toContainText('PIPE-102');
    await expect(page.locator('[data-role="properties-content"]')).toContainText('PIPE-102');
    await expect(page.locator('[data-role="properties-content"]')).toContainText('Stainless Steel');
  });

  test('contextual action publishes analysis request without global tab routing', async ({ page }) => {
    await page.goto('/');

    await page.locator('[data-entity-id="SUP-201"]').click();
    await page.locator('[data-action="request-analysis"]').click();

    await expect(page.locator('[data-role="viewport-selection"]')).toContainText('support-load');
    await expect(page.locator('[data-role="viewport-selection"]')).toContainText('SUP-201');
  });
});
