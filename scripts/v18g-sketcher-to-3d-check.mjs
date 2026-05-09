import fs from 'node:fs';
function fail(message){ console.error(`V18G check failed: ${message}`); process.exit(1); }
for (const file of ['src/sketcher/adapters/sketcherTo3DCalculationModel.js','src/sketcher/SketcherStore.js','src/sketcher/SketcherTab.jsx','scripts/v18g-sketcher-to-3d-behavior-test.mjs']) {
  if (!fs.existsSync(file)) fail(`Missing required file: ${file}`);
}
const adapter = fs.readFileSync('src/sketcher/adapters/sketcherTo3DCalculationModel.js','utf8');
for (const token of ['SKETCHER_TO_3D_CALC_MODEL_SCHEMA_VERSION','build3DCalculationModelFromSketcher','validate3DCalculationModel','lineClass']) {
  if (!adapter.includes(token)) fail(`Adapter missing token: ${token}`);
}
const store = fs.readFileSync('src/sketcher/SketcherStore.js','utf8');
for (const token of ['build3DCalculationModel','pushTo3DSimplifiedCalculation','last3DCalculationModel']) {
  if (!store.includes(token)) fail(`SketcherStore missing token: ${token}`);
}

const tab = fs.readFileSync('src/sketcher/SketcherTab.jsx','utf8');
for (const token of ['sketcher-push-to-3d-simplified','Push to 3D Simplified']) {
  if (!tab.includes(token)) fail(`SketcherTab missing token: ${token}`);
}

console.log('V18G sketcher-to-3D static check passed.');
