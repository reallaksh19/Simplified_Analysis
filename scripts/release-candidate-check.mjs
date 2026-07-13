#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const checks = {
  governanceRecords: [
    'AUDIT_CURRENT_BASELINE.md',
    'RELEASE_CANDIDATE_REGISTER.md',
    'FINAL_PENDING_REGISTER.md',
    'docs/analysis-workspace/PHASE_1_ARCHITECTURE.md',
    'docs/analysis-workspace/PHASE_2_DATASET_ADAPTER.md',
    'docs/analysis-workspace/PHASE_3_READONLY_VIEWPORT.md',
    'docs/analysis-workspace/PHASE_4_VIEWPORT_PICKING.md',
    'docs/analysis-workspace/PHASE_5_CONTEXTUAL_ANALYSIS.md',
    'docs/analysis-workspace/PHASE_6_ANALYSIS_SESSIONS.md',
    'docs/analysis-workspace/PHASE_7_ANALYSIS_LEDGER.md',
  ],
  certificationScripts: [
    'scripts/u3-engineering-data-check.mjs',
    'scripts/u3-engineering-data-behavior-test.mjs',
    'scripts/u4-sketcher-topology-check.mjs',
    'scripts/u4-sketcher-topology-behavior-test.mjs',
    'scripts/u5-solver-certification-check.mjs',
    'scripts/u5-solver-certification-behavior-test.mjs',
    'scripts/u6-active-reporting-check.mjs',
    'scripts/u6-active-reporting-behavior-test.mjs',
    'scripts/u7-browser-qa-check.mjs',
    'scripts/phase1-workspace-contract-check.mjs',
    'scripts/phase2-workspace-contract-check.mjs',
    'scripts/phase3-viewport-contract-check.mjs',
    'scripts/phase4-viewport-picking-contract-check.mjs',
    'scripts/phase5-analysis-capability-contract-check.mjs',
    'scripts/phase6-analysis-session-contract-check.mjs',
    'scripts/phase7-analysis-ledger-contract-check.mjs',
    'scripts/release-candidate-check.mjs',
  ],
  sourceContracts: [
    'src/core/engineering-data/resolveEngineeringData.js',
    'src/sketcher/topology/validateSketchTopology.js',
    'src/sketcher/topology/classifyTeeMainBranch.js',
    'src/core/solvers/certification/solverResultContract.js',
    'src/reporting/publishActiveReportContext.js',
    'src/reporting/buildReportPayload.js',
    'src/workspace/event-bus.js',
    'src/workspace/event-topics.js',
    'src/workspace/dataset-adapter.js',
    'src/workspace/dataset-controller.js',
    'src/workspace/workspace-state.js',
    'src/workspace/geometry-evidence.js',
    'src/workspace/viewport-render-model.js',
    'src/workspace/viewport-hit-test.js',
    'src/workspace/viewport-renderer.js',
    'src/workspace/canvas2d-viewport-backend.js',
    'src/workspace/three-viewport-backend.js',
    'src/workspace/analysis-capability-registry.js',
    'src/workspace/analysis-capabilities.js',
    'src/workspace/analysis-context.js',
    'src/workspace/analysis-coordinator.js',
    'src/workspace/analysis-input-evidence.js',
    'src/workspace/analysis-session-context.js',
    'src/workspace/analysis-session-store.js',
    'src/workspace/analysis-session-controller.js',
    'src/workspace/analysis-session-view.js',
    'src/workspace/analysis-ledger-store.js',
    'src/workspace/analysis-ledger-controller.js',
    'src/workspace/analysis-ledger-comparison.js',
    'src/workspace/analysis-ledger-view.js',
    'src/workspace/analysis-report.js',
    'src/workspace/analysis-report-export.js',
    'src/workspace/support-load-capability.js',
    'src/workspace/pipe-screening-capability.js',
    'src/workspace/properties-view.js',
    'src/workspace/bootstrap.js',
  ],
  browserEvidence: [
    'e2e/phase1-analysis-workspace.spec.js',
    'e2e/phase2-workspace-dataset.spec.js',
    'e2e/phase3-viewport-renderer.spec.js',
    'e2e/phase4-viewport-picking.spec.js',
    'e2e/phase5-analysis-capabilities.spec.js',
    'e2e/phase6-analysis-sessions.spec.js',
    'e2e/phase7-analysis-ledger.spec.js',
    'e2e/smoke.spec.js',
    'e2e/u7-workflow-smoke.spec.js',
  ],
};

const legacyDocumentNames = [
  'PHASE_U3_ENGINEERING_DATA_UNIFICATION.md',
  'PHASE_U4_SKETCHER_TOPOLOGY_FITTINGS.md',
  'PHASE_U5_SOLVER_CERTIFICATION_CONTRACT.md',
  'PHASE_U6_ACTIVE_CALCULATION_REPORTING.md',
  'PHASE_U7_BROWSER_QA_DETERMINISTIC_CI.md',
];

let passCount = 0;
let failCount = 0;

function check(category, files) {
  console.log(`\n## ${category}`);
  for (const file of files) {
    const fullPath = path.join(rootDir, file);
    const exists = fs.existsSync(fullPath);
    console.log(`${exists ? 'PASS' : 'FAIL'}: ${file}`);
    if (exists) passCount++;
    else failCount++;
  }
}

function warnForLegacyDocuments() {
  console.log('\n## Superseded Legacy Document Names');
  for (const file of legacyDocumentNames) {
    const exists = fs.existsSync(path.join(rootDir, file));
    console.log(`${exists ? 'PASS' : 'WARNING'}: ${file}`);
  }
  console.log('Executable phase checks and current governance records are the release source of truth.');
}

console.log('# Release Candidate Certification Check\n');
check('Governance Records', checks.governanceRecords);
check('Certification Scripts', checks.certificationScripts);
check('Source Contracts', checks.sourceContracts);
check('Browser Evidence', checks.browserEvidence);
warnForLegacyDocuments();

console.log('\n## Optional Files (Warnings Only)');
const optionalSettingsResolver = 'src/core/settings/resolveEngineeringSettings.js';
console.log(`${fs.existsSync(path.join(rootDir, optionalSettingsResolver)) ? 'PASS' : 'WARNING'}: Engineering Settings Resolver (${optionalSettingsResolver})`);

console.log('\n## Summary');
const total = passCount + failCount;
console.log(`Total required checks: ${total}`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);

if (failCount > 0) {
  console.error('\n❌ Release candidate check FAILED');
  process.exit(1);
}
console.log('\n✓ Release candidate check PASSED');
