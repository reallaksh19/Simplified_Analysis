import { test, expect } from '@playwright/test';
import { openSketcher, ensureSketcherPanels } from './helpers/v18lWorkflowHelpers.js';

test.describe('V18L Sketcher display workflow', () => {
  test('display controls are visible and can toggle coordinates/lengths', async ({ page }) => {
    await openSketcher(page);
    await ensureSketcherPanels(page);

    await expect(page.getByTestId('sketcher-toggle-node-coordinates')).toBeVisible();
    await expect(page.getByTestId('sketcher-toggle-segment-lengths')).toBeVisible();

    await page.getByTestId('sketcher-toggle-node-coordinates').click();
    await page.getByTestId('sketcher-toggle-segment-lengths').click();

    await expect(page.getByTestId('sketcher-display-settings-panel')).toBeVisible();
  });
});
