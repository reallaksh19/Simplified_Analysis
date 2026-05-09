import fs from 'node:fs';

function fail(message) {
  console.error(`V19H check failed: ${message}`);
  process.exit(1);
}

const required = [
  'src/data/masterDbBulkValidation.js',
  'src/masterDb/MasterDbBulkToolsPanel.jsx',
  'src/masterDb/MasterDbEditorTab.jsx',
  'scripts/v19h-masterdb-bulk-validation-behavior-test.mjs',
];

for (const file of required) {
  if (!fs.existsSync(file)) fail(`Missing required file: ${file}`);
}

const validation = fs.readFileSync('src/data/masterDbBulkValidation.js', 'utf8');
for (const token of [
  'MASTER_DB_BULK_VALIDATION_SCHEMA_VERSION',
  'validateMasterDbBulkData',
  'buildMasterDbCoverageMatrix',
  'parseAndValidateMasterDbImport',
  'BULK_COMPONENT_DUPLICATE_KEY',
  'BULK_FLANGE_DUPLICATE_KEY',
  'BULK_B169_DUPLICATE_KEY',
]) {
  if (!validation.includes(token)) fail(`masterDbBulkValidation missing token: ${token}`);
}

const editor = fs.readFileSync('src/masterDb/MasterDbEditorTab.jsx', 'utf8');
if (!editor.includes('MasterDbBulkToolsPanel') || !editor.includes('<MasterDbBulkToolsPanel />')) {
  fail('MasterDbEditorTab must render MasterDbBulkToolsPanel.');
}

console.log('V19H Master DB bulk validation static check passed.');
