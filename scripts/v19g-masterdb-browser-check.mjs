import fs from 'node:fs';

function fail(message) {
  console.error(`V19G check failed: ${message}`);
  process.exit(1);
}

const required = [
  'e2e/helpers/v19gMasterDbWorkflowHelpers.js',
  'e2e/v19g-master-db-browser.spec.js',
  'src/masterDb/MasterDbEditorTab.jsx',
  'src/masterDb/MasterDbValidationPanel.jsx',
  'src/masterDb/MasterDbBulkToolsPanel.jsx',
  'scripts/v19g-masterdb-browser-behavior-test.mjs',
];

for (const file of required) {
  if (!fs.existsSync(file)) fail(`Missing required file: ${file}`);
}

const spec = fs.readFileSync('e2e/v19g-master-db-browser.spec.js', 'utf8');
const helper = fs.readFileSync('e2e/helpers/v19gMasterDbWorkflowHelpers.js', 'utf8');
const e2eSource = `${spec}\n${helper}`;

for (const token of [
  'master-db-editor-tab',
  'master-db-flange-dimension-table',
  'master-db-b169-table',
  'master-db-validation-summary',
  'master-db-bulk-tools-panel',
]) {
  if (!e2eSource.includes(token)) fail(`V19G E2E source missing token: ${token}`);
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const scriptName of ['check:v19g', 'check:v19g:behavior', 'check:e2e:v19g']) {
  if (!pkg.scripts?.[scriptName]) fail(`package.json missing script: ${scriptName}`);
}

console.log('V19G Master DB browser static check passed.');
