import { test, expect } from '@playwright/test';
import fixture from './fixtures/3d-simplified/component-placement-warning-run.json' with { type: 'json' };

test.describe('Slice R — Sketcher placement clamp warning', () => {
  test('shows a visible warning when placement is clamped and preserves report metadata', async ({ page }) => {
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
        selectedSegmentId: caseData.sketcher.segments[0].id,
        selectedNodeId: null,
        workingPlane: caseData.sketcher.workingPlane,
        workingElevation: caseData.sketcher.workingElevation,
        designTemperature: caseData.sketcher.designTemperature
      });
    }, fixture);

    await expect(page.getByText('Segment: S001')).toBeVisible();

    const ratioInput = page.getByTestId('sketcher-component-placement-ratio');
    await ratioInput.fill(String(fixture.componentButton.requestedPlacementPercent));

    await page.getByTestId(fixture.componentButton.testId).click();

    await page.waitForFunction(() => {
      const store = window.__SIMPLIFIED_ANALYSIS_SKETCHER_STORE__;
      return store.getState().segments.length === 3 &&
        Object.keys(store.getState().nodes).length === 4;
    });

    const warning = page.getByTestId('sketcher-component-placement-warning');

    await expect(warning).toBeVisible();
    await expect(warning).toContainText('Placement was clamped');
    await expect(warning).toContainText(`Requested ratio: ${fixture.componentButton.requestedPlacementRatio}`);
    await expect(warning).toContainText(`Actual ratio: ${fixture.componentButton.actualPlacementRatio}`);
    await expect(warning).toContainText(`Minimum pipe stub: ${fixture.componentButton.minimumPipeStub_mm} mm`);
    await expect(warning).toContainText(`Start distance: ${fixture.componentButton.expectedStartDistance_mm} mm`);
    await expect(warning).toContainText(`End distance: ${fixture.componentButton.expectedEndDistance_mm} mm`);

    await page.getByTestId('sketcher-push-to-3d-simplified').click();

    await expect(page.getByTestId('3d-simplified-analysis-tab')).toBeVisible();
    await expect(page.getByRole('heading', { name: '3D Simplified Calculation' })).toBeVisible();

    await expect(page.getByTestId('3d-simplified-model-validation-status')).toContainText(
      fixture.expected.validationStatus
    );

    const modelSummary = page.getByTestId('3d-simplified-imported-model-summary');

    await expect(modelSummary).toContainText(`Nodes: ${fixture.expected.nodes}`);
    await expect(modelSummary).toContainText(`Segments: ${fixture.expected.segments}`);
    await expect(modelSummary).toContainText(`Supports: ${fixture.expected.supports}`);

    const reportMarkdown = page.getByTestId('3d-simplified-report-markdown');

    await expect(reportMarkdown).toContainText('## Component Placement Table');
    await expect(reportMarkdown).toContainText(fixture.expected.masterDbRowId);
    await expect(reportMarkdown).toContainText(fixture.expected.propertySource);
    await expect(reportMarkdown).toContainText(String(fixture.componentButton.requestedPlacementRatio));
    await expect(reportMarkdown).toContainText(String(fixture.componentButton.actualPlacementRatio));
    await expect(reportMarkdown).toContainText('true');

    const reportJson = page.getByTestId('3d-simplified-report-json');

    await expect(reportJson).toContainText('"componentPlacementTable"');
    await expect(reportJson).toContainText(`"requestedPlacementRatio": ${fixture.componentButton.requestedPlacementRatio}`);
    await expect(reportJson).toContainText(`"actualPlacementRatio": ${fixture.componentButton.actualPlacementRatio}`);
    await expect(reportJson).toContainText(`"placementWasClamped": ${fixture.componentButton.placementWasClamped}`);
    await expect(reportJson).toContainText(`"minimumPipeStub_mm": ${fixture.componentButton.minimumPipeStub_mm}`);
  });
});
