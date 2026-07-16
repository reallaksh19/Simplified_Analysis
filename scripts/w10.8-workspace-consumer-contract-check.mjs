import assert from 'node:assert/strict';
import {
  activateApplicationViewState, createApplicationViewState, createWorkspaceConsumerContext,
  createWorkspaceConsumerReadiness, createWorkspaceConsumerRegistry,
  validateApplicationViewState, validateWorkspaceConsumerContext, validateWorkspaceConsumerReadiness,
} from '../src/core/workspace-consumers/index.js';
import {
  archiveModelCalculationPackage, createModelCalculationLedger, createModelCalculationPackage,
  createModelCalculationReport, PACKAGE_MODES,
} from '../src/core/model-calculation-package/index.js';
import { buildCalculationFixture } from './w10.7-fixtures.mjs';

console.log('\n--- W10.8 workspace consumer contracts ---\n');
const registry = createWorkspaceConsumerRegistry();
assert.equal(registry.schema, 'workspace-consumer-registry/v1');
assert.deepEqual(registry.consumers.map((row) => row.consumerId).sort(), ['DEBUG','LOAD_CALC','PIPE_SOLVER','QA','REPORTS','THREE_D_CALC','WORKSPACE']);
assert.equal(registry.consumers.find((row) => row.consumerId === 'REPORTS').implementationStatus, 'IMPLEMENTED');
assert.equal(registry.consumers.find((row) => row.consumerId === 'LOAD_CALC').implementationStatus, 'NOT_IMPLEMENTED');

const empty = createWorkspaceConsumerContext();
assert.equal(validateWorkspaceConsumerContext(empty).ok, true);
assert.equal(empty.availabilitySummary.availableContractCount, 0);
assertDeepFrozen(empty);
assert.equal(empty.contextId, createWorkspaceConsumerContext().contextId);

const fixture = buildCalculationFixture();
const packageValue = createModelCalculationPackage({
  packageMode: PACKAGE_MODES.COMBINED,
  screeningSnapshot: fixture.screeningSnapshot,
  verticalBeamSnapshot: fixture.verticalBeamSnapshot,
  modelReference: fixture.modelReference,
});
const ledger = archiveModelCalculationPackage(createModelCalculationLedger(packageValue.datasetId), packageValue);
const report = createModelCalculationReport(ledger.entries[0]);
const full = createWorkspaceConsumerContext({
  datasetId: packageValue.datasetId, workspaceVersion: 8, selectedEntityId: 'PIPE-1',
  contracts: { modelCalculationLedger: ledger, activeModelCalculationPackage: packageValue, activeModelCalculationReport: report },
});
assert.equal(full.contracts.modelCalculationLedger, ledger);
assert.equal(full.contracts.activeModelCalculationPackage, packageValue);
assert.equal(full.contracts.activeModelCalculationReport, report);
assert.equal(full.contractReferences.find((row) => row.contractKey === 'activeModelCalculationPackage').semanticHash, packageValue.semanticHash);
assert.equal(validateWorkspaceConsumerContext(full).ok, true);

const reportsReady = createWorkspaceConsumerReadiness(registry, full, 'REPORTS');
assert.equal(validateWorkspaceConsumerReadiness(reportsReady).ok, true);
assert.equal(reportsReady.readinessState, 'AVAILABLE');
assert.equal(createWorkspaceConsumerReadiness(registry, empty, 'REPORTS').readinessState, 'BLOCKED_MISSING_CONTRACTS');
assert.equal(createWorkspaceConsumerReadiness(registry, full, 'LOAD_CALC').readinessState, 'NOT_IMPLEMENTED');
assert.throws(() => createWorkspaceConsumerReadiness(registry, full, 'UNKNOWN'), /Unknown workspace consumer/);

const readinessById = {
  WORKSPACE: createWorkspaceConsumerReadiness(registry, empty, 'WORKSPACE'),
  REPORTS: createWorkspaceConsumerReadiness(registry, empty, 'REPORTS'),
};
let view = createApplicationViewState(readinessById);
assert.equal(view.activeViewId, 'WORKSPACE');
assert.equal(validateApplicationViewState(view).ok, true);
assert.equal(activateApplicationViewState(view, 'REPORTS', readinessById.REPORTS), view);
readinessById.REPORTS = reportsReady;
view = activateApplicationViewState(createApplicationViewState(readinessById), 'REPORTS', reportsReady);
assert.equal(view.activeViewId, 'REPORTS');
assert.throws(() => activateApplicationViewState(view, 'NOPE', reportsReady), /Unknown application view/);

const mismatch = createWorkspaceConsumerContext({
  datasetId: 'OTHER', contracts: { modelCalculationLedger: ledger, activeModelCalculationPackage: packageValue, activeModelCalculationReport: report },
});
assert.equal(mismatch.contracts.activeModelCalculationPackage, null);
assert.ok(mismatch.diagnostics.some((row) => row.code === 'DATASET_MISMATCH'));
assert.equal(packageValue.semanticHash, full.contracts.activeModelCalculationPackage.semanticHash);
console.log('✅ W10.8 workspace consumer contracts passed.\n');

function assertDeepFrozen(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value); assert.equal(Object.isFrozen(value), true);
  Object.values(value).forEach((child) => assertDeepFrozen(child, seen));
}