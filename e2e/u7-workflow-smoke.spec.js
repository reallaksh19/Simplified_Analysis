import { test, expect } from '@playwright/test';

const SUPPORT_PACKAGE = {
  schema: 'rvm-selected-geometry-workspace-package/v1',
  packageHash: 'U7-SUPPORT-DATASET',
  geometry: {
    objects: [],
    supports: [
      {
        id: 'SUP-201',
        name: 'Guide Support 201',
        type: 'GUIDE',
        sourcePath: '/LINE-1/SUP-201',
        sourceAttributes: { SUPPORT_TYPE: 'Guide' },
      },
    ],
    branches: [],
  },
};

test.describe('Consolidated Analysis Workspace browser smoke', () => {
  test('loads the three-panel shell without legacy top navigation', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Simplified Analysis/i);
    await expect(page.locator('[data-panel="tree"]')).toHaveCount(1);
    await expect(page.locator('[data-panel="viewport"]')).toHaveCount(1);
    await expect(page.locator('[data-panel="properties"]')).toHaveCount(1);
    await expect(page.locator('nav')).toHaveCount(0);
  });

  test('direct EventBus selection updates properties without tree coupling', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      EventBus.publish('viewport:entitySelected', {
        entityId: 'PIPE-102',
        properties: { material: 'Steel' },
      });
    });

    const propertiesPanel = page.locator('[data-panel="properties"]');
    await expect(propertiesPanel).toContainText('PIPE-102');
    await expect(propertiesPanel).toContainText('material');
    await expect(propertiesPanel).toContainText('Steel');
  });

  test('tree selection publishes contextual analysis without global routing', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-role="dataset-file"]').setInputFiles({
      name: 'support.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(SUPPORT_PACKAGE)),
    });

    await page.locator('[data-entity-id="SUP-201"]').click();
    await expect(page.locator('[data-panel="properties"]')).toContainText('SUP-201');

    await page.getByRole('button', { name: 'Run contextual analysis' }).click();
    await expect(page.locator('[data-role="viewport-selection"]')).toHaveText(
      'Requested: support-load · SUP-201',
    );
  });
});
