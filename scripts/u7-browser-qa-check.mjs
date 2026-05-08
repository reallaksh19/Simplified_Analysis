import fs from 'fs';
import path from 'path';

let success = true;

console.log('\n--- U7 Browser QA Static Checks ---\n');

// Check 1: Verify required E2E spec files exist
const requiredE2EFiles = [
  'e2e/smoke.spec.js',
  'e2e/u7-workflow-smoke.spec.js',
];

for (const file of requiredE2EFiles) {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.error(`❌ ${file} NOT found`);
    success = false;
  }
}

// Check 2: Verify playwright.config.js contains artifact configuration
console.log();
const playwrightConfigPath = path.join(process.cwd(), 'playwright.config.js');
if (fs.existsSync(playwrightConfigPath)) {
  const configContent = fs.readFileSync(playwrightConfigPath, 'utf8');
  if (configContent.includes('screenshot') || configContent.includes('on-failure')) {
    console.log('✅ playwright.config.js contains artifact configuration');
  } else {
    console.log('⚠️ playwright.config.js does not explicitly mention screenshot/video/trace artifacts');
  }
} else {
  console.error('❌ playwright.config.js NOT found');
  success = false;
}

// Check 3: Verify qa-check.mjs contains Date.now guard text
console.log();
const qaCheckPath = path.join(process.cwd(), 'scripts/qa-check.mjs');
if (fs.existsSync(qaCheckPath)) {
  const qaCheckContent = fs.readFileSync(qaCheckPath, 'utf8');
  if (qaCheckContent.includes('Date.now') || qaCheckContent.includes('performance.now')) {
    console.log('✅ scripts/qa-check.mjs contains timestamp guard');
  } else {
    console.log('⚠️ scripts/qa-check.mjs does not yet contain timestamp guard checks');
  }
} else {
  console.error('❌ scripts/qa-check.mjs NOT found');
  success = false;
}

// Check 4: Verify e2e/u7-workflow-smoke.spec.js contains expected test structure
console.log();
const u7SpecPath = path.join(process.cwd(), 'e2e/u7-workflow-smoke.spec.js');
if (fs.existsSync(u7SpecPath)) {
  const specContent = fs.readFileSync(u7SpecPath, 'utf8');
  const hasTestStructure = specContent.includes('test.describe') &&
                           specContent.includes('settings-contract-hash') &&
                           specContent.includes('settings-results-stale-banner');
  if (hasTestStructure) {
    console.log('✅ e2e/u7-workflow-smoke.spec.js has expected test structure');
  } else {
    console.error('❌ e2e/u7-workflow-smoke.spec.js structure incomplete');
    success = false;
  }
} else {
  console.error('❌ e2e/u7-workflow-smoke.spec.js NOT found');
  success = false;
}

console.log();
if (!success) {
  process.exit(1);
}

console.log('✅ All U7 browser QA static checks passed.\n');
