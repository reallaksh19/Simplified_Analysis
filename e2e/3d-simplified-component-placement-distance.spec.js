import { test, expect } from '@playwright/test';
import fixture from './fixtures/3d-simplified/component-placement-distance-run.json' with { type: 'json' };

test.describe('Slice U — component placement by absolute distance', () => {
  test('places a component by center distance in mm and preserves placement metadata', async ({ page }) => {
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

    await page
      .getByTestId('sketcher-component-placement-distance-mm')
      .fill(String(fixture.componentButton.requestedPlacementDistance_mm));

    await page.getByTestId(fixture.componentButton.testId).click();

    await page.waitForFunction(() => {
      const store = window.__SIMPLIFIED_ANALYSIS_SKETCHER_STORE__;
      return store.getState().segments.length === 3 &&
        Object.keys(store.getState().nodes).length === 4;
    });

    const splitState = await page.evaluate(() => {
      const store = window.__SIMPLIFIED_ANALYSIS_SKETCHER_STORE__;

      return {
        nodeCount: Object.keys(store.getState().nodes).length,
        segmentCount: store.getState().segments.length,
        selectedSegmentId: store.getState().selectedSegmentId,
        segments: store.getState().segments.map((segment) => ({
          id: segment.id,
          type: segment.type,
          splitRole: segment.properties?.splitRole,
          masterDbRowId: segment.properties?.masterDbRowId,
          placementInputMode: segment.properties?.placementInputMode,
          requestedPlacementDistance_mm: segment.properties?.requestedPlacementDistance_mm,
          actualPlacementDistance_mm: segment.properties?.actualPlacementDistance_mm,
          componentCenterDistance_mm: segment.properties?.componentCenterDistance_mm,
          requestedPlacementRatio: segment.properties?.requestedPlacementRatio,
          actualPlacementRatio: segment.properties?.actualPlacementRatio,
          placementWasClamped: segment.properties?.placementWasClamped,
          componentStartDistance_mm: segment.properties?.componentStartDistance_mm,
          componentEndDistance_mm: segment.properties?.componentEndDistance_mm,
          componentWeight_kg: segment.properties?.componentWeight_kg,
          componentLength_mm: segment.properties?.componentLength_mm
        }))
      };
    });

    expect(splitState.nodeCount).toBe(fixture.expected.nodes);
    expect(splitState.segmentCount).toBe(fixture.expected.segments);

    const componentSegment = splitState.segments.find(
      (segment) => segment.splitRole === 'inline-component'
    );

    expect(componentSegment).toBeTruthy();
    expect(componentSegment.masterDbRowId).toBe(fixture.expected.masterDbRowId);
    expect(componentSegment.placementInputMode).toBe('distance_mm');
    expect(componentSegment.requestedPlacementDistance_mm).toBe(
      fixture.componentButton.requestedPlacementDistance_mm
    );
    expect(componentSegment.actualPlacementDistance_mm).toBe(
      fixture.componentButton.requestedPlacementDistance_mm
    );
    expect(componentSegment.componentCenterDistance_mm).toBe(
      fixture.componentButton.requestedPlacementDistance_mm
    );
    expect(componentSegment.requestedPlacementRatio).toBe(
      fixture.componentButton.requestedPlacementRatio
    );
    expect(componentSegment.actualPlacementRatio).toBe(
      fixture.componentButton.actualPlacementRatio
    );
    expect(componentSegment.placementWasClamped).toBe(false);
    expect(componentSegment.componentStartDistance_mm).toBe(
      fixture.componentButton.expectedStartDistance_mm
    );
    expect(componentSegment.componentEndDistance_mm).toBe(
      fixture.componentButton.expectedEndDistance_mm
    );
    expect(componentSegment.componentWeight_kg).toBe(
      fixture.componentButton.expectedComponentWeight_kg
    );
    expect(componentSegment.componentLength_mm).toBe(
      fixture.componentButton.expectedComponentLength_mm
    );

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
    await expect(reportMarkdown).toContainText(String(fixture.componentButton.expectedStartDistance_mm));
    await expect(reportMarkdown).toContainText(String(fixture.componentButton.expectedEndDistance_mm));

    const reportJson = page.getByTestId('3d-simplified-report-json');

    await expect(reportJson).toContainText('"componentPlacementTable"');
    await expect(reportJson).toContainText(fixture.expected.masterDbRowId);
  });
});