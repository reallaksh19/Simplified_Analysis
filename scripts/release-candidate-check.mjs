#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const checks = {
  phaseDocs: [
    'AUDIT_CURRENT_BASELINE.md',
    'PHASE_U3_ENGINEERING_DATA_UNIFICATION.md',
    'PHASE_U4_SKETCHER_TOPOLOGY_FITTINGS.md',
    'PHASE_U5_SOLVER_CERTIFICATION_CONTRACT.md',
    'PHASE_U6_ACTIVE_CALCULATION_REPORTING.md',
    'PHASE_U7_BROWSER_QA_DETERMINISTIC_CI.md',
    'RELEASE_CANDIDATE_REGISTER.md',
    'FINAL_PENDING_REGISTER.md',
  ],
  scripts: [
    'scripts/u3-engineering-data-check.mjs',
    'scripts/u3-engineering-data-behavior-test.mjs',
    'scripts/u4-sketcher-topology-check.mjs',
    'scripts/u4-sketcher-topology-behavior-test.mjs',
    'scripts/u5-solver-certification-check.mjs',
    'scripts/u5-solver-certification-behavior-test.mjs',
    'scripts/u6-active-reporting-check.mjs',
    'scripts/u6-active-reporting-behavior-test.mjs',
    'scripts/u7-browser-qa-check.mjs',
    'scripts/release-candidate-check.mjs',
  ],
  sourceFunctions: [
    'src/core/engineering-data/resolveEngineeringData.js',
    'src/sketcher/topology/validateSketchTopology.js',
    'src/sketcher/topology/classifyTeeMainBranch.js',
    'src/core/solvers/certification/solverResultContract.js',
    'src/reporting/publishActiveReportContext.js',
    'src/reporting/buildReportPayload.js',
  ],
};

let passCount = 0;
let failCount = 0;

function check(category, files) {
  console.log(`\n## ${category}`);
  for (const file of files) {
    const fullPath = path.join(rootDir, file);
    const exists = fs.existsSync(fullPath);
    const status = exists ? 'PASS' : 'FAIL';
    console.log(`${status}: ${file}`);
    if (exists) {
      passCount++;
    } else {
      failCount++;
    }
  }
}

function checkWarning(file, label) {
  const fullPath = path.join(rootDir, file);
  const exists = fs.existsSync(fullPath);
  const status = exists ? 'PASS' : 'WARNING';
  console.log(`${status}: ${label} (${file})`);
  if (!exists) {
    console.log(`  → File may be named differently or located elsewhere`);
  }
}

console.log('# Release Candidate Certification Check\n');

check('Phase Documentation', checks.phaseDocs);
check('Scripts', checks.scripts);
check('Source Functions', checks.sourceFunctions);

console.log('\n## Optional Files (Warnings Only)');
checkWarning('src/core/settings/resolveEngineeringSettings.js', 'Engineering Settings Resolver');

console.log('\n## Summary');
const total = passCount + failCount;
console.log(`Total checks: ${total}`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);

if (failCount > 0) {
  console.error(`\n❌ Release candidate check FAILED`);
  process.exit(1);
} else {
  console.log(`\n✓ Release candidate check PASSED`);
  process.exit(0);
}
