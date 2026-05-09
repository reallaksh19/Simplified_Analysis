import { test, expect } from '@playwright/test';
import {
  openSketcher,
  open3DSimplified,
  ensure3DPanels,
  clickByTestIdOrText,
  clickPushTo3DSimplifiedIfSafe,
} from './helpers/v18lWorkflowHelpers.js';

test.describe('V18L Sketcher push to 3D Simplified Calculation', () => {
  test('push workflow button is visible and 3D panels are reachable', async ({ page }) => {
    await openSketcher(page);

    await clickPushTo3DSimplifiedIfSafe(page);

    await open3DSimplified(page);
    await ensure3DPanels(page);

    await clickByTestIdOrText(page, '3d-validate-assignments', /validate assignments/i);
    await expect(page.getByTestId('3d-calculation-assignment-panel')).toBeVisible();
  });
});
