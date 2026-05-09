import fs from 'node:fs';

function fail(message) {
  console.error(`V18L browser workflow behavior check failed: ${message}`);
  process.exit(1);
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

const specFiles = [
  'e2e/v18l-sketcher-display.spec.js',
  'e2e/v18l-sketcher-element-panel.spec.js',
  'e2e/v18l-push-to-3d-simplified.spec.js',
  'e2e/v18l-3d-calculation-workflow.spec.js',
];

for (const file of specFiles) {
  const source = read(file);

  if (source.includes('test.only') || source.includes('describe.only')) {
    fail(`${file} contains .only`);
  }

  if (!source.includes("from '@playwright/test'")) {
    fail(`${file} must import Playwright test API.`);
  }

  if (!source.includes('v18lWorkflowHelpers.js')) {
    fail(`${file} must use shared V18L workflow helpers.`);
  }

  if (!source.includes('data-testid') && !source.includes('getByTestId')) {
    fail(`${file} must use stable test ids.`);
  }
}

const helper = read('e2e/helpers/v18lWorkflowHelpers.js');
for (const token of [
  'openSketcher',
  'open3DSimplified',
  'ensureSketcherPanels',
  'ensure3DPanels',
  'expectAnyVisible',
]) {
  if (!helper.includes(token)) {
    fail(`Workflow helper missing token: ${token}`);
  }
}

const certification = read('scripts/v18l-release-certification.mjs');
for (const token of [
  'check:v18l',
  'check:v18l:behavior',
  'check:e2e:v18l',
  'reports/v18l-certification-summary.json',
]) {
  if (!certification.includes(token)) {
    fail(`Certification script missing token: ${token}`);
  }
}

console.log('V18L browser workflow behavior/static hygiene check passed.');
