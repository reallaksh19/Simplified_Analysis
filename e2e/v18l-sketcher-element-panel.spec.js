import { test, expect } from '@playwright/test';
import { openSketcher, ensureSketcherPanels } from './helpers/v18lWorkflowHelpers.js';

test.describe('V18L Sketcher element listing panel', () => {
  test('element listing tabs are visible', async ({ page }) => {
    await openSketcher(page);
    await ensureSketcherPanels(page);

    await expect(page.getByTestId('element-panel-tab-pipes')).toBeVisible();
    await expect(page.getByTestId('element-panel-tab-fittings')).toBeVisible();
    await expect(page.getByTestId('element-panel-tab-components')).toBeVisible();
    await expect(page.getByTestId('element-panel-tab-supports')).toBeVisible();
    await expect(page.getByTestId('element-panel-tab-warnings')).toBeVisible();
  });
});
