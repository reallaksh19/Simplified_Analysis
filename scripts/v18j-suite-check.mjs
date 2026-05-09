import fs from 'node:fs';
function fail(message){ console.error(`V18J check failed: ${message}`); process.exit(1); }
for (const file of ['src/3d-analysis/solverSuite/run3DSimplifiedCalculationSuite.js','src/3d-analysis/SimplifiedCalculationSuitePanel.jsx','src/3d-analysis/AnalysisStore.js','scripts/v18j-suite-behavior-test.mjs']) {
  if (!fs.existsSync(file)) fail(`Missing required file: ${file}`);
}
const suite = fs.readFileSync('src/3d-analysis/solverSuite/run3DSimplifiedCalculationSuite.js','utf8');
for (const token of ['SIMPLIFIED_3D_SUITE_SCHEMA_VERSION','buildGC3DPayloadFromCalculationModel','runGuidedCantileverFromCalculationModel','run3DSimplifiedCalculationSuite']) {
  if (!suite.includes(token)) fail(`Suite missing token: ${token}`);
}
console.log('V18J suite static check passed.');
