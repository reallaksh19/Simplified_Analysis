import { test, expect } from '@playwright/test';
import {
  openSketcher,
  open3DSimplified,
  ensure3DPanels,
  clickByTestIdOrText,
  clickPushTo3DSimplifiedIfSafe,
} from './helpers/v18lWorkflowHelpers.js';

test.describe('V18L 3D Simplified Calculation workflow panels', () => {
  test('support loads, force actions, suite and report controls are visible and clickable', async ({ page }) => {
    await openSketcher(page);
    await clickPushTo3DSimplifiedIfSafe(page);

    await open3DSimplified(page);
    await ensure3DPanels(page);

    await expect(page.getByTestId('3d-run-support-loads')).toBeVisible();
    await expect(page.getByTestId('3d-run-force-actions')).toBeVisible();
    await expect(page.getByTestId('3d-run-guided-cantilever-thermal')).toBeVisible();
    await expect(page.getByTestId('3d-run-simplified-suite')).toBeVisible();
    await expect(page.getByTestId('3d-build-report')).toBeVisible();

    await clickByTestIdOrText(page, '3d-run-support-loads', /run support loads/i);
    await clickByTestIdOrText(page, '3d-run-force-actions', /run force actions/i);
    await clickByTestIdOrText(page, '3d-run-simplified-suite', /run full suite/i);
    await clickByTestIdOrText(page, '3d-build-report', /build report/i);

    await expect(page.getByTestId('3d-simplified-report-panel')).toBeVisible();
  });
});
