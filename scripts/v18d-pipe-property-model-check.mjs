import fs from 'node:fs';

function fail(message) {
  console.error(`V18D check failed: ${message}`);
  process.exit(1);
}

const requiredFiles = [
  'src/sketcher/pipeProperties/pipePropertyModel.js',
  'src/sketcher/SegmentEditorPanel.jsx',
  'src/sketcher/SketcherStore.js',
  'scripts/v18d-pipe-property-model-behavior-test.mjs',
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) fail(`Missing required file: ${file}`);
}

const model = fs.readFileSync('src/sketcher/pipeProperties/pipePropertyModel.js', 'utf8');
for (const token of [
  'PIPE_PROPERTY_SCHEMA_VERSION',
  'DEFAULT_PIPE_CLASS',
  'normalizePipeClass',
  'getSegmentPipeClass',
  'applyPipeClassToSegment',
  'validateSegmentPipeProperties',
  'lineClass',
  'ratingClass',
]) {
  if (!model.includes(token)) fail(`pipePropertyModel missing token: ${token}`);
}

const editor = fs.readFileSync('src/sketcher/SegmentEditorPanel.jsx', 'utf8');
for (const token of [
  'segment-rating-class',
  'segment-face-type',
  'segment-flange-type',
  'segment-valve-type',
  'Temperature / Pressure',
  'Fluid / Insulation',
]) {
  if (!editor.includes(token)) fail(`SegmentEditorPanel missing token: ${token}`);
}

const store = fs.readFileSync('src/sketcher/SketcherStore.js', 'utf8');
for (const token of [
  'defaultPipeClass',
  'applyPipeClassToSegment',
  'validatePipeProperties',
]) {
  if (!store.includes(token)) fail(`SketcherStore missing pipe property token: ${token}`);
}

const pipeSchedulesPath = 'src/core/geometry/pipeSchedules.js';
if (!fs.existsSync(pipeSchedulesPath)) {
  fail('Required dependency missing: src/core/geometry/pipeSchedules.js');
}

const pipeSchedules = fs.readFileSync(pipeSchedulesPath, 'utf8');
for (const token of [
  'export function getPipeDimensions',
  'export function getAvailableSchedules',
]) {
  if (!pipeSchedules.includes(token)) {
    fail(`pipeSchedules dependency missing export token: ${token}`);
  }
}

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (packageJson.type !== 'module') {
  fail('package.json must remain type: module for the ESM check scripts.');
}

for (const scriptName of [
  'build',
  'check:benchmarks',
  'check:v18d',
  'check:v18d:behavior',
  'check:v18e',
  'check:v18e:behavior',
  'check:v18f',
  'check:v18f:behavior',
]) {
  if (!packageJson.scripts?.[scriptName]) {
    fail(`package.json missing script: ${scriptName}`);
  }
}

console.log('V18D pipe property model static check passed.');
