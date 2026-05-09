import fs from 'node:fs';

function fail(message) {
  console.error(`V18E check failed: ${message}`);
  process.exit(1);
}

const requiredFiles = [
  'src/sketcher/componentProperties/componentEngineeringModel.js',
  'src/sketcher/SketcherStore.js',
  'scripts/v18e-component-engineering-model-behavior-test.mjs',
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) fail(`Missing required file: ${file}`);
}

const model = fs.readFileSync('src/sketcher/componentProperties/componentEngineeringModel.js', 'utf8');
for (const token of [
  'COMPONENT_ENGINEERING_SCHEMA_VERSION',
  'createReducerComponent',
  'createTeeComponent',
  'createValveComponent',
  'createFlangeComponent',
  'createFlangeValveFlangeAssembly',
  'validateComponentEngineeringData',
  'componentLengthMm',
  'componentWeightKg',
]) {
  if (!model.includes(token)) fail(`componentEngineeringModel missing token: ${token}`);
}

const store = fs.readFileSync('src/sketcher/SketcherStore.js', 'utf8');
for (const token of [
  'components',
  'upsertComponent',
  'validateComponents',
]) {
  if (!store.includes(token)) fail(`SketcherStore missing component token: ${token}`);
}

console.log('V18E component engineering model static check passed.');
