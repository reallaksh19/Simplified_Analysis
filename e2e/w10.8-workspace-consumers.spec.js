import { expect, test } from '@playwright/test';

const DATASET = {
  schema: 'inputxml-managed-stage/v1', packageHash: 'W10.8-BROWSER', unit: 'mm',
  objects: [
    { id: 'PIPES', name: 'Pipes', type: 'BRANCH', children: [pipe('PIPE-A', [0,0,0], [1000,0,0]), pipe('PIPE-B', [1000,0,0], [2000,0,0])] },
    { id: 'SUPPORTS', name: 'Supports', type: 'GROUP', children: [support('SUP-A', [0,0,0], 'PIPE-A:port:start'), support('SUP-B', [2000,0,0], 'PIPE-B:port:end')] },
  ],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { globalThis.__WORKSPACE_VIEWPORT_BACKEND__ = 'canvas2d'; });
});

test('framework-neutral shell adopts the active W10.7 report without resetting state', async ({ page }) => {
  const downloads = [];
  page.on('download', (download) => downloads.push(download.suggestedFilename()));
  await page.goto('/');
  const nav = page.locator('[data-role="application-navigation"]');
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('tab', { name: 'Workspace' })).toHaveAttribute('aria-selected', 'true');
  for (const label of ['Reports', 'Load Calc', '3D Calc', 'Pipe Solver', 'QA', 'Debug']) {
    const button = nav.getByRole('tab', { name: label });
    await expect(button).toBeDisabled(); await expect(button).toHaveAttribute('aria-disabled', 'true');
  }
  expect(await page.evaluate(() => AnalysisWorkspace.getWorkspaceConsumerReadiness('REPORTS').readinessState)).toBe('BLOCKED_MISSING_CONTRACTS');
  expect(await page.evaluate(() => AnalysisWorkspace.getApplicationViewState().activeViewId)).toBe('WORKSPACE');

  await upload(page, DATASET);
  await page.locator('[data-entity-id="PIPE-A"]').click();
  await page.getByRole('button', { name: 'Run Tributary Screening' }).click();
  await page.getByRole('button', { name: 'Solve Vertical Stiffness' }).click();
  await page.locator('[data-model-calculation-control="mode"]').selectOption('SCREENING_AND_VERTICAL_BEAM');
  await page.getByRole('button', { name: 'Create Calculation Package' }).click();
  await expect.poll(() => page.evaluate(() => AnalysisWorkspace.getWorkspaceConsumerReadiness('REPORTS').readinessState)).toBe('AVAILABLE');
  await expect(nav.getByRole('tab', { name: 'Reports' })).toBeEnabled();

  const before = await page.evaluate(() => ({
    datasetId: AnalysisWorkspace.getSnapshot().dataset.datasetId,
    selectedEntityId: AnalysisWorkspace.getSnapshot().selectedEntityId,
    screening: AnalysisWorkspace.getSupportLoadScreening().semanticHash,
    beam: AnalysisWorkspace.getVerticalBeamSolution().semanticHash,
    ledger: AnalysisWorkspace.getModelCalculationLedger().semanticHash,
  }));
  await nav.getByRole('tab', { name: 'Reports' }).click();
  await expect(page.locator('[data-role="reports-consumer"]')).toBeVisible();
  await expect(page.locator('[data-role="reports-consumer"]')).toContainText('This is not a full pipe-stress or code-compliance report.');
  await expect(page.locator('[data-role="reports-consumer"]')).toContainText('BENCHMARKED_SCREENING');
  await expect(page.locator('[data-role="reports-consumer"]')).toContainText('LINEAR_ELASTIC_VERTICAL_BEAM');
  await expect(page.locator('[data-role="reports-consumer"]')).toContainText('screenedVerticalForceN');
  await expect(page.locator('[data-role="reports-consumer"]')).toContainText('signedSupportForceN');
  await expect(page.locator('[data-role="reports-consumer"]')).toContainText('maximumAbsoluteDisplacementM');

  for (const name of ['Export JSON', 'Export CSV', 'Export Markdown']) {
    await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name }).click()]);
  }
  expect(downloads).toHaveLength(3);
  await nav.getByRole('tab', { name: 'Workspace' }).click();
  const after = await page.evaluate(() => ({
    datasetId: AnalysisWorkspace.getSnapshot().dataset.datasetId,
    selectedEntityId: AnalysisWorkspace.getSnapshot().selectedEntityId,
    screening: AnalysisWorkspace.getSupportLoadScreening().semanticHash,
    beam: AnalysisWorkspace.getVerticalBeamSolution().semanticHash,
    ledger: AnalysisWorkspace.getModelCalculationLedger().semanticHash,
  }));
  expect(after).toEqual(before);
});

test('replacement, clear and teardown reset the application view safely', async ({ page }) => {
  await page.goto('/'); await upload(page, DATASET);
  await page.getByRole('button', { name: 'Run Tributary Screening' }).click();
  await page.getByRole('button', { name: 'Solve Vertical Stiffness' }).click();
  await page.locator('[data-model-calculation-control="mode"]').selectOption('SCREENING_AND_VERTICAL_BEAM');
  await page.getByRole('button', { name: 'Create Calculation Package' }).click();
  await page.getByRole('tab', { name: 'Reports' }).click();
  await upload(page, { ...DATASET, packageHash: 'W10.8-BROWSER-REPLACED' });
  expect(await page.evaluate(() => AnalysisWorkspace.getApplicationViewState().activeViewId)).toBe('WORKSPACE');
  expect(await page.evaluate(() => AnalysisWorkspace.getModelCalculationLedger().entries.length)).toBe(0);
  await page.getByRole('button', { name: 'Clear' }).click();
  expect(await page.evaluate(() => AnalysisWorkspace.getWorkspaceConsumerContext().datasetId)).toBeNull();
  await page.evaluate(() => AnalysisWorkspace.destroy());
  await expect(page.locator('#root')).toBeEmpty();
});

async function upload(page, payload) { await page.locator('[data-role="dataset-file"]').setInputFiles({ name: 'w10.8.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(payload)) }); }
function pipe(id, a, b) { return { id, name: id, type: 'PIPE', geometry: { start: a, end: b }, properties: { outsideDiameterMm: 114.3, wallThicknessMm: 6, materialDensityKgM3: 7850, fluidDensityKgM3: 1000, elasticModulusPa: 2e11 } }; }
function support(id, position, targetPortId) { return { id, name: id, type: 'SUPPORT', geometry: { position }, properties: { supportType: 'REST', targetPortId, verticalTranslationRestrained: true } }; }