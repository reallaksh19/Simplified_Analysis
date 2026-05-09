import fs from 'node:fs';
function fail(message){ console.error(`V18H check failed: ${message}`); process.exit(1); }
for (const file of ['src/3d-analysis/CalculationAssignmentPanel.jsx','src/3d-analysis/AnalysisStore.js','src/3d-analysis/AnalysisTab.jsx','scripts/v18h-3d-assignment-behavior-test.mjs']) {
  if (!fs.existsSync(file)) fail(`Missing required file: ${file}`);
}
const panel = fs.readFileSync('src/3d-analysis/CalculationAssignmentPanel.jsx','utf8');
for (const token of ['3d-calculation-assignment-panel','3d-assignment-selector','3d-segment-assignment-editor','3d-validate-assignments']) {
  if (!panel.includes(token)) fail(`Panel missing token: ${token}`);
}
const store = fs.readFileSync('src/3d-analysis/AnalysisStore.js','utf8');
for (const token of ['calculationModel','importCalculationModel','updateCalculationSegment','validateCalculationAssignments']) {
  if (!store.includes(token)) fail(`AnalysisStore missing token: ${token}`);
}
console.log('V18H 3D assignment static check passed.');
