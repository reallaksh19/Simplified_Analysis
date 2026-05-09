import { expect } from '@playwright/test';

export async function openApp(page) {
  page.on('dialog', async (dialog) => dialog.dismiss().catch(() => {}));
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
}

async function clickFirstVisible(page, locators) {
  for (const locator of locators) {
    const count = await locator.count().catch(() => 0);
    for (let index = 0; index < count; index += 1) {
      const item = locator.nth(index);
      if (await item.isVisible().catch(() => false)) {
        await item.click();
        return true;
      }
    }
  }
  return false;
}

export async function openMasterDb(page) {
  await openApp(page);
  await clickFirstVisible(page, [
    page.getByRole('button', { name: /Master DB/i }),
    page.getByText(/Master DB/i),
    page.locator('[data-testid="nav-master-db"]'),
    page.locator('[data-tab="master-db"]'),
  ]);
  await page.waitForTimeout(250);
}

export async function expectMasterDbPanels(page) {
  await expect(page.getByTestId('master-db-editor-tab')).toBeVisible();
  await expect(page.getByTestId('master-db-component-weight-table')).toBeVisible();
  await expect(page.getByTestId('master-db-import-export-panel')).toBeVisible();
  await expect(page.getByTestId('master-db-validation-panel')).toBeVisible();
  await expect(page.getByTestId('master-db-bulk-tools-panel')).toBeVisible();
}
