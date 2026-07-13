import { expect, test } from '@playwright/test';

test('publishes selection without left-panel coupling and detaches on destroy', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('.workspace-shell')).toBeVisible();
  await expect(page.locator('[data-panel="tree"]')).toHaveCount(1);
  await expect(page.locator('[data-panel="viewport"]')).toHaveCount(1);
  await expect(page.locator('[data-panel="properties"]')).toHaveCount(1);
  await expect(page.locator('nav')).toHaveCount(0);

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

  expect(await page.evaluate(() => EventBus.listenerCount('viewport:entitySelected'))).toBe(2);

  await page.evaluate(() => AnalysisWorkspace.destroy());

  expect(await page.evaluate(() => EventBus.listenerCount('dataset:loaded'))).toBe(0);
  expect(await page.evaluate(() => EventBus.listenerCount('viewport:entitySelected'))).toBe(0);
  expect(await page.evaluate(() => EventBus.listenerCount('analysis:requested'))).toBe(0);
});

test('tree selection and contextual analysis remain event-driven', async ({ page }) => {
  await page.goto('/');

  await page.locator('[data-entity-id="SUP-201"]').click();
  await expect(page.locator('[data-panel="properties"]')).toContainText('SUP-201');
  await expect(page.locator('[data-panel="properties"]')).toContainText('Guide');

  await page.getByRole('button', { name: 'Run contextual analysis' }).click();
  await expect(page.locator('[data-role="viewport-selection"]')).toHaveText(
    'Requested: support-load · SUP-201',
  );
});
