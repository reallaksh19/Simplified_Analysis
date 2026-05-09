import { test, expect } from '@playwright/test';
import { openMasterDb, expectMasterDbPanels } from './helpers/v19gMasterDbWorkflowHelpers.js';

// V19G_BROWSER_REQUIRED_TEST_IDS:
        // master-db-editor-tab, master-db-bulk-tools-panel,
        // master-db-flange-dimension-table, master-db-b169-table,
        // master-db-validation-summary
test.describe('V19G Master DB browser certification', () => {
  test('Master DB tab exposes main tables and validation panels', async ({ page }) => {
    await openMasterDb(page);
    await expectMasterDbPanels(page);

    await page.getByTestId('master-db-tab-flange-dimensions').click();
    await expect(page.getByTestId('master-db-flange-dimension-table')).toBeVisible();

    await page.getByTestId('master-db-tab-b169').click();
    await expect(page.getByTestId('master-db-b169-table')).toBeVisible();
  });

  test('Master DB validation blocks final issue with screening seed data', async ({ page }) => {
    await openMasterDb(page);
    await page.getByTestId('master-db-validation-issue-type').selectOption('FINAL_ISSUE');
    await page.getByTestId('master-db-run-validation').click();
    await expect(page.getByTestId('master-db-validation-summary')).toContainText(/BLOCKED|Errors:/i);
  });

  test('Bulk tools validate JSON input and expose coverage', async ({ page }) => {
    await openMasterDb(page);
    await page.getByTestId('master-db-bulk-json-input').fill(JSON.stringify({
      componentWeightRows: [],
      flangeDimensionalRows: [],
      b169FittingRows: [],
    }, null, 2));
    await page.getByTestId('master-db-bulk-validate-import').click();
    await expect(page.getByTestId('master-db-bulk-validation-summary')).toBeVisible();
    await expect(page.getByTestId('master-db-bulk-coverage-summary')).toBeVisible();
  });
});
