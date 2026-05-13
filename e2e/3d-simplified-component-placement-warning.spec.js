import { test, expect } from '@playwright/test';
import fixture from './fixtures/3d-simplified/component-placement-warning-run.json' with { type: 'json' };

test.describe('Slice R — component placement warning UI', () => {
  test('displays clamp warning with formatted requested and actual ratios in segment editor', async ({ page }) => {
    await page.addInitScript(() => {
      window.__SIMPLIFIED_ANALYSIS_E2E__ = true;
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    await page.getByTestId('nav-tab-sketcher').click();

    await page.waitForFunction(() =>
      Boolean(window.__SIMPLIFIED_ANALYSIS_SKETCHER_STORE__)
    );

    await page.evaluate((caseData) => {
      const store = window.__SIMPLIFIED_ANALYSIS_SKETCHER_STORE__;

      store.setState({
        nodes: caseData.sketcher.nodes,
        segments: caseData.sketcher.segments,
        selectedSegmentId: caseData.sketcher.selectedSegmentId,
      });
    }, fixture);

    const warningBox = page.getByTestId('sketcher-component-placement-warning');

    if (fixture.expected.warningVisible) {
      await expect(warningBox).toBeVisible();
      await expect(warningBox).toContainText('Placement was clamped');
      await expect(warningBox).toContainText(fixture.expected.requestedText);
      await expect(warningBox).toContainText(fixture.expected.actualText);
    } else {
      await expect(warningBox).not.toBeVisible();
    }
  });
});
