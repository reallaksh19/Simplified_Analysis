import fs from 'node:fs';

function fail(message) {
  console.error(`V18L browser workflow check failed: ${message}`);
  process.exit(1);
}

const requiredFiles = [
  'e2e/helpers/v18lWorkflowHelpers.js',
  'e2e/v18l-sketcher-display.spec.js',
  'e2e/v18l-sketcher-element-panel.spec.js',
  'e2e/v18l-push-to-3d-simplified.spec.js',
  'e2e/v18l-3d-calculation-workflow.spec.js',
  'scripts/v18l-browser-workflow-behavior-test.mjs',
  'scripts/v18l-release-certification.mjs',
  'playwright.config.js',

  'src/sketcher/SketcherDisplaySettingsPanel.jsx',
  'src/sketcher/ElementListingPanel.jsx',
  'src/sketcher/SketcherTab.jsx',
  'src/3d-analysis/CalculationAssignmentPanel.jsx',
  'src/3d-analysis/SupportLoadResultsPanel.jsx',
  'src/3d-analysis/ForceActionResultsPanel.jsx',
  'src/3d-analysis/SimplifiedCalculationSuitePanel.jsx',
  'src/3d-analysis/Report3DSimplifiedPanel.jsx',
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) fail(`Missing required file: ${file}`);
}

const uiTokenFiles = {
  'src/sketcher/SketcherDisplaySettingsPanel.jsx': [
    'sketcher-display-settings-panel',
    'sketcher-toggle-node-coordinates',
    'sketcher-toggle-segment-lengths',
  ],
  'src/sketcher/ElementListingPanel.jsx': [
    'sketcher-element-listing-panel',
    'element-panel-tab-pipes',
    'element-panel-tab-warnings',
  ],
  'src/sketcher/SketcherTab.jsx': [
    'sketcher-push-to-3d-simplified',
    'Push to 3D Simplified',
  ],
  'src/3d-analysis/AnalysisTab.jsx': [
    '3d-simplified-imported-model-summary',
    'CalculationAssignmentPanel',
    'SupportLoadResultsPanel',
    'ForceActionResultsPanel',
    'SimplifiedCalculationSuitePanel',
    'Report3DSimplifiedPanel',
  ],
  'src/3d-analysis/CalculationAssignmentPanel.jsx': [
    '3d-calculation-assignment-panel',
    '3d-validate-assignments',
  ],
  'src/3d-analysis/SupportLoadResultsPanel.jsx': [
    '3d-support-load-results-panel',
    '3d-run-support-loads',
  ],
  'src/3d-analysis/ForceActionResultsPanel.jsx': [
    '3d-force-action-results-panel',
    '3d-run-force-actions',
  ],
  'src/3d-analysis/SimplifiedCalculationSuitePanel.jsx': [
    '3d-simplified-suite-panel',
    '3d-run-simplified-suite',
  ],
  'src/3d-analysis/Report3DSimplifiedPanel.jsx': [
    '3d-simplified-report-panel',
    '3d-build-report',
  ],
};

for (const [file, tokens] of Object.entries(uiTokenFiles)) {
  const source = fs.readFileSync(file, 'utf8');
  for (const token of tokens) {
    if (!source.includes(token)) fail(`${file} missing token: ${token}`);
  }
}

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

for (const scriptName of [
  'check:e2e',
  'check:v18l',
  'check:v18l:behavior',
  'check:e2e:v18l',
  'certify:v18l',
  'ci:v18l',
]) {
  if (!packageJson.scripts?.[scriptName]) {
    fail(`package.json missing script: ${scriptName}`);
  }
}

if (!packageJson.devDependencies?.['@playwright/test'] && !packageJson.dependencies?.['@playwright/test']) {
  fail('Playwright test dependency missing: @playwright/test');
}

const playwrightConfig = fs.readFileSync('playwright.config.js', 'utf8');
for (const token of [
  'baseURL',
  'webServer',
  'npm run dev',
  'http://localhost:5173',
]) {
  if (!playwrightConfig.includes(token)) {
    fail(`playwright.config.js missing token: ${token}`);
  }
}

console.log('V18L browser workflow static check passed.');
