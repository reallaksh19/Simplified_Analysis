import fs from 'node:fs';

function fail(message) {
  console.error(`V19F check failed: ${message}`);
  process.exit(1);
}

const requiredFiles = [
  'src/sketcher/componentProperties/segmentMasterDbInputs.js',
  'src/sketcher/SketcherMasterDbInsertPanel.jsx',
  'src/sketcher/SegmentEditorPanel.jsx',
  'src/sketcher/ElementListingPanel.jsx',
  'scripts/v19f-sketcher-masterdb-wiring-behavior-test.mjs',
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) fail(`Missing required file: ${file}`);
}

const helper = fs.readFileSync('src/sketcher/componentProperties/segmentMasterDbInputs.js', 'utf8');
for (const token of ['SEGMENT_MASTER_DB_INPUTS_SCHEMA_VERSION','extractMasterDbInputFromSegment','resolveFvfForSegment','resolveReducerForSegment','resolveFlangeValveFlangeInsertData','resolveReducerInsertData']) {
  if (!helper.includes(token)) fail(`segmentMasterDbInputs missing token: ${token}`);
}

const panel = fs.readFileSync('src/sketcher/SketcherMasterDbInsertPanel.jsx', 'utf8');
for (const token of ['sketcher-master-db-insert-panel','sketcher-master-db-preview-fvf','sketcher-master-db-insert-fvf','sketcher-master-db-preview-reducer','sketcher-master-db-insert-reducer']) {
  if (!panel.includes(token)) fail(`SketcherMasterDbInsertPanel missing token: ${token}`);
}

const segmentEditor = fs.readFileSync('src/sketcher/SegmentEditorPanel.jsx', 'utf8');
if (!segmentEditor.includes('SketcherMasterDbInsertPanel') || !segmentEditor.includes('<SketcherMasterDbInsertPanel segmentId={selectedSegmentId} />')) {
  fail('SegmentEditorPanel must render SketcherMasterDbInsertPanel for selected segment.');
}

const listing = fs.readFileSync('src/sketcher/ElementListingPanel.jsx', 'utf8');
for (const token of ['element-panel-insert-reducer','element-panel-insert-fvf','resolveReducerInsertData','resolveFlangeValveFlangeInsertData']) {
  if (!listing.includes(token)) fail(`ElementListingPanel missing master DB quick-insert token: ${token}`);
}

for (const forbidden of ['length_mm: 178','weight_kg: 12','valveFaceToFace_mm: 495','flangeThickness_mm: 41.3','valveWeight_kg: 142']) {
  if (listing.includes(forbidden) || segmentEditor.includes(forbidden) || panel.includes(forbidden)) {
    fail(`Forbidden hard-coded component data found: ${forbidden}`);
  }
}

console.log('V19F 2D Sketcher Master DB wiring static check passed.');
