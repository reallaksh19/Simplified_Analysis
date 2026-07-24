import { expect, test } from '@playwright/test';

test('runs and exports the explicit Element FEA reference model', async ({ page }) => {
  await page.goto('/');
  const tab = page.getByRole('button', { name: 'Element FEA' });
  await expect(tab).toHaveAttribute('aria-disabled', 'false');
  await tab.click();
  await expect(page.locator('[data-role="element-fea-consumer"]')).toBeVisible();
  await expect(page.locator('[data-role="element-fea-consumer"]')).toContainText('T3 small-displacement linear elasticity only.');
  await page.getByRole('button', { name: 'Load Explicit Example' }).click();
  await page.getByRole('button', { name: 'Run Element FEA' }).click();
  const output = page.locator('[data-role="element-fea-output"]');
  await expect(output).toContainText('"status": "QUALIFIED"');
  await expect(output).toContainText('"strainEnergy": 0.016');
  await expect(output).toContainText('"semanticHash"');
  const state = await page.evaluate(() => AnalysisWorkspace.getApplicationViewState());
  expect(state.schema).toBe('application-view-state/v5');
  expect(state.activeViewId).toBe('ELEMENT_FEA');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export Qualified Result' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/-lfea-result\.json$/);
});

test('rejects incomplete input without publishing partial results', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Element FEA' }).click();
  await page.locator('[data-role="element-fea-input"]').fill('{"schema":"fea-continuum-model/v1"}');
  await page.getByRole('button', { name: 'Run Element FEA' }).click();
  await expect(page.locator('[data-role="element-fea-output"]')).toContainText('REJECTED_INVALID');
  await expect(page.getByRole('button', { name: 'Export Qualified Result' })).toBeDisabled();
});
