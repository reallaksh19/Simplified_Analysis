import fs from 'node:fs';
import { expect, test } from '@playwright/test';

const STAGED_PACKAGE = {
  schema: 'inputxml-managed-stage/v1', packageHash: 'W10.8-BROWSER', unit: 'mm',
  objects: [
    { id: 'PIPES', name: 'Pipes', type: 'BRANCH', children: [
      pipe('PIPE-A', [0, 0, 0], [1000, 0, 0]),
      pipe('PIPE-B', [1000, 0, 0], [2000, 0, 0]),
    ] },
    { id: 'SUPPORTS', name: 'Supports', type: 'GROUP', children: [
      support('SUP-START', [0, 0, 0], 'PIPE-A:port:start'),
      support('SUP-END', [2000, 0, 0], 'PIPE-B:port:end'),
    ] },
  ],
};

const NAVIGATION = ['Workspace', 'Reports', 'Load Calc', '3D Calc', 'Pipe Solver', 'QA', 'Debug'];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    globalThis.__WORKSPACE_VIEWPORT_BACKEND__ = 'canvas2d';
    globalThis.__w108UrlAudit = { created: 0, revoked: 0 };
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (blob) => { globalThis.__w108UrlAudit.created += 1; return create(blob); };
    URL.revokeObjectURL = (url) => { globalThis.__w108UrlAudit.revoked += 1; return revoke(url); };
  });
});

test('adopts archived W10.7 evidence in the framework-neutral Reports view', async ({ page }) => {
  let downloadCount = 0;
  page.on('download', () => { downloadCount += 1; });
  await page.goto('/');
  await installEventAudit(page);

  const nav = page.locator('[data-role="application-navigation"]');
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('button')).toHaveText(NAVIGATION);
  await expect(nav.getByRole('button', { name: 'Workspace' })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('button', { name: 'Reports' })).toBeDisabled();
  for (const label of NAVIGATION.slice(2)) {
    const button = nav.getByRole('button', { name: label });
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute('aria-disabled', 'true');
    await expect(button).toHaveAttribute('title', /not implemented/i);
  }
  expect(await page.evaluate(() => AnalysisWorkspace.getApplicationViewState().activeViewId)).toBe('WORKSPACE');
  expect(await page.evaluate(() => AnalysisWorkspace.listWorkspaceConsumers().length)).toBe(7);
  expect(await page.evaluate(() => AnalysisWorkspace.getWorkspaceConsumerReadiness('REPORTS').readinessState)).toBe('BLOCKED_MISSING_CONTRACTS');
  expect(downloadCount).toBe(0);

  await uploadJson(page, 'w10.8-browser.json', STAGED_PACKAGE);
  await page.locator('[data-entity-id="PIPE-A"]').click();
  await prepareCalculations(page);
  await createPackage(page, 'VERTICAL_BEAM_ONLY');
  const beamEntry = await page.evaluate(() => AnalysisWorkspace.getModelCalculationLedger().activeEntryId);
  await createPackage(page, 'SCREENING_AND_VERTICAL_BEAM');
  expect(await page.evaluate(() => AnalysisWorkspace.getModelCalculationLedger().entries.length)).toBe(2);
  await expect(nav.getByRole('button', { name: 'Reports' })).toBeEnabled();
  expect(await page.evaluate(() => AnalysisWorkspace.getWorkspaceConsumerReadiness('REPORTS').readinessState)).toBe('AVAILABLE');
  expect(downloadCount).toBe(0);

  const before = await preservedState(page);
  const eventBaseline = await eventCounts(page);
  await nav.getByRole('button', { name: 'Workspace' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(nav.getByRole('button', { name: 'Reports' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-application-view="REPORTS"]')).toBeVisible();
  await expect(page.locator('[data-panel="tree"]')).toBeAttached();
  expect(await page.evaluate(() => AnalysisWorkspace.getApplicationViewState().activeViewId)).toBe('REPORTS');

  const reports = page.locator('[data-role="reports-consumer"]');
  await expect(reports).toContainText('SCREENING_AND_VERTICAL_BEAM');
  await expect(reports).toContainText('BENCHMARKED_SCREENING');
  await expect(reports).toContainText('LINEAR_ELASTIC_VERTICAL_BEAM');
  await expect(reports).toContainText('screenedVerticalForceN');
  await expect(reports).toContainText('signedSupportForceN');
  await expect(reports).toContainText('upwardSupportForceN');
  await expect(reports).toContainText('Max displacement m');
  await expect(reports).toContainText('Force residual N');
  await expect(reports).toContainText('not a full pipe-stress or code-compliance report');

  const downloads = [];
  for (const name of ['Export Package JSON', 'Export Report CSV', 'Export Report Markdown']) {
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name }).click()]);
    downloads.push({ name: download.suggestedFilename(), content: fs.readFileSync(await download.path(), 'utf8') });
  }
  expect(downloads.every((row) => row.content.endsWith('\n'))).toBe(true);
  expect(JSON.parse(downloads[0].content).package.schema).toBe('model-calculation-package/v1');
  expect(downloads[1].content).toContain('screening force');
  expect(downloads[2].content).toContain('not a full pipe-stress or code-compliance report');
  expect(await page.evaluate(() => globalThis.__w108UrlAudit)).toEqual({ created: 3, revoked: 3 });

  await page.locator('[data-reports-control="entry"]').selectOption(beamEntry);
  await page.getByRole('button', { name: 'Select Archived Package' }).click();
  expect(await page.evaluate(() => AnalysisWorkspace.getModelCalculationLedger().activeEntryId)).toBe(beamEntry);

  await nav.getByRole('button', { name: 'Workspace' }).click();
  await expect(page.locator('[data-application-view="WORKSPACE"]')).toBeVisible();
  expect(await preservedState(page)).toEqual({ ...before, activeEntryId: beamEntry });
  expect(await eventCounts(page)).toEqual(eventBaseline);
  expect(downloadCount).toBe(3);
  expect(await page.evaluate(() => AnalysisWorkspace.getWorkspaceConsumerContext().contracts.sharedModel === AnalysisWorkspace.getSharedModel())).toBe(true);
  expect(await page.evaluate(() => { try { AnalysisWorkspace.getWorkspaceConsumerReadiness('UNKNOWN'); return false; } catch { return true; } })).toBe(true);
});

test('same-ID replacement, clear and teardown reset view readiness without automatic work', async ({ page }) => {
  let downloadCount = 0;
  page.on('download', () => { downloadCount += 1; });
  await page.goto('/');
  await installEventAudit(page);
  await uploadJson(page, 'w10.8-first.json', STAGED_PACKAGE);
  await prepareCalculations(page);
  await createPackage(page, 'SCREENING_AND_VERTICAL_BEAM');
  await page.getByRole('button', { name: 'Reports' }).click();
  const initialDatasetId = await page.evaluate(() => AnalysisWorkspace.getSnapshot().dataset.datasetId);
  const eventBaseline = await eventCounts(page);

  await uploadJson(page, 'w10.8-replacement.json', STAGED_PACKAGE);
  await expect(page.getByRole('button', { name: 'Reports' })).toBeDisabled();
  expect(await page.evaluate(() => AnalysisWorkspace.getSnapshot().dataset.datasetId)).toBe(initialDatasetId);
  expect(await page.evaluate(() => AnalysisWorkspace.getApplicationViewState().activeViewId)).toBe('WORKSPACE');
  expect(await page.evaluate(() => AnalysisWorkspace.getModelCalculationLedger().entries.length)).toBe(0);
  expect(await page.evaluate(() => AnalysisWorkspace.getActiveModelCalculationReport())).toBeNull();
  expect(downloadCount).toBe(0);

  await prepareCalculations(page);
  await createPackage(page, 'SCREENING_AND_VERTICAL_BEAM');
  await page.getByRole('button', { name: 'Reports' }).click();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  expect(await page.evaluate(() => AnalysisWorkspace.getSnapshot().status)).toBe('empty');
  expect(await page.evaluate(() => AnalysisWorkspace.getApplicationViewState().activeViewId)).toBe('WORKSPACE');
  expect(await page.evaluate(() => AnalysisWorkspace.getWorkspaceConsumerContext().datasetId)).toBeNull();

  await page.evaluate(() => AnalysisWorkspace.destroy());
  await expect(page.locator('#root')).toBeEmpty();
  expect(await page.evaluate(() => AnalysisWorkspace.getWorkspaceConsumerContext())).toBeNull();
  expect(await page.evaluate(() => AnalysisWorkspace.getApplicationViewState())).toBeNull();
  await page.evaluate(() => EventBus.publish('applicationView:changeRequested', { viewId: 'REPORTS', source: 'test' }));
  await page.waitForTimeout(50);
  expect(await eventCounts(page)).toEqual({ ...eventBaseline, screeningRuns: 2, beamSolves: 2 });
  expect(downloadCount).toBe(0);
  expect(await page.evaluate(() => globalThis.__w108UrlAudit)).toEqual({ created: 0, revoked: 0 });
});

async function prepareCalculations(page) {
  await page.getByRole('button', { name: 'Run Tributary Screening' }).click();
  await expect(page.locator('[data-role="support-load-screening-status"]')).toContainText('completed');
  await page.getByRole('button', { name: 'Solve Vertical Stiffness' }).click();
  await expect(page.locator('[data-role="vertical-beam-status"]')).toContainText('completed');
}
async function createPackage(page, mode) {
  await page.locator('[data-model-calculation-control="mode"]').selectOption(mode);
  await page.getByRole('button', { name: 'Create Calculation Package' }).click();
  await expect(page.locator('[data-role="model-calculation-status"]')).toContainText('Archived');
}
async function installEventAudit(page) {
  await page.evaluate(() => {
    globalThis.__w108Events = { analysis: 0, screeningRuns: 0, beamSolves: 0 };
    EventBus.subscribe('analysis:started', () => { globalThis.__w108Events.analysis += 1; });
    EventBus.subscribe('supportLoadScreening:runRequested', () => { globalThis.__w108Events.screeningRuns += 1; });
    EventBus.subscribe('verticalBeam:solveRequested', () => { globalThis.__w108Events.beamSolves += 1; });
  });
}
async function uploadJson(page, name, payload) { await page.locator('[data-role="dataset-file"]').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(payload)) }); }
async function eventCounts(page) { return page.evaluate(() => globalThis.__w108Events); }
async function preservedState(page) {
  return page.evaluate(() => ({
    datasetId: AnalysisWorkspace.getSnapshot().dataset.datasetId,
    selectedEntityId: AnalysisWorkspace.getSnapshot().selectedEntityId,
    screeningHash: AnalysisWorkspace.getSupportLoadScreening().semanticHash,
    beamHash: AnalysisWorkspace.getVerticalBeamSolution().semanticHash,
    packageHashes: AnalysisWorkspace.getModelCalculationLedger().entries.map((row) => row.packageSemanticHash),
    entryCount: AnalysisWorkspace.getModelCalculationLedger().entries.length,
    activeEntryId: AnalysisWorkspace.getModelCalculationLedger().activeEntryId,
  }));
}
function pipe(id, startPoint, endPoint) {
  return { id, name: id, type: 'PIPE', sourcePath: `/MODEL/PIPES/${id}`, sourceAttributes: { LINE_ID: 'LINE-W10.8', SYSTEM_ID: 'SYS-W10.8', EI_N_M2: 2000000, UNIT_PIPE_WEIGHT_KG_PER_M: 10, INSULATION_THICKNESS_MM: 0, FLUID_WT_OPE_KG_M: 2, FLUID_WT_HYD_KG_M: 3 }, nativeParams: { startPoint, endPoint } };
}
function support(id, position, attachedPortId) {
  return { id, name: id, type: 'SUPPORT', sourcePath: `/MODEL/SUPPORTS/${id}`, sourceAttributes: { LINE_ID: 'LINE-W10.8', SYSTEM_ID: 'SYS-W10.8', POS: { x: position[0], y: position[1], z: position[2] }, ATTACHED_PORT_ID: attachedPortId, SUPPORT_TYPE: 'ANCHOR', VERTICAL_CAPABILITY: 'RESTRAINED' } };
}
