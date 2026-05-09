import fs from 'node:fs';

function fail(message) {
  console.error(`V19G behavior check failed: ${message}`);
  process.exit(1);
}

const spec = fs.readFileSync('e2e/v19g-master-db-browser.spec.js', 'utf8');
if (spec.includes('test.only') || spec.includes('describe.only')) fail('V19G E2E spec contains .only');

for (const token of [
  "from '@playwright/test'",
  'v19gMasterDbWorkflowHelpers.js',
  'getByTestId',
  'master-db-bulk-validate-import',
]) {
  if (!spec.includes(token)) fail(`V19G E2E spec missing token: ${token}`);
}

const helper = fs.readFileSync('e2e/helpers/v19gMasterDbWorkflowHelpers.js', 'utf8');
for (const token of ['openMasterDb', 'expectMasterDbPanels', 'openApp']) {
  if (!helper.includes(token)) fail(`V19G helper missing token: ${token}`);
}

console.log('V19G Master DB browser behavior/static hygiene check passed.');
