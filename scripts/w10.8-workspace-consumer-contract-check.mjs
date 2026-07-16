import assert from 'node:assert/strict';
import {
  CONSUMER_IDS,
  createApplicationViewState,
  createWorkspaceConsumerContext,
  createWorkspaceConsumerReadiness,
  createWorkspaceConsumerRegistry,
  IMPLEMENTATION_STATUS,
  READINESS_STATES,
  refreshApplicationViewState,
  transitionApplicationViewState,
  validateApplicationViewState,
  validateWorkspaceConsumerContext,
  validateWorkspaceConsumerReadiness,
  validateWorkspaceConsumerRegistry,
  workspaceConsumerDescriptor,
} from '../src/core/workspace-consumers/index.js';
import { deepFreeze, semanticHash } from '../src/core/shared-piping-model/index.js';
import { buildWorkspaceConsumerFixture } from './w10.8-fixtures.mjs';

const checks = {
  context: checkContexts,
  registry: checkRegistry,
  readiness: checkReadiness,
  views: checkViews,
  immutability: checkImmutability,
};
const selected = process.argv[2];
console.log(`\n--- W10.8 ${selected || 'workspace consumer contracts'} ---\n`);
if (selected) run(selected); else Object.keys(checks).forEach(run);
console.log('✅ W10.8 workspace consumer contracts passed.\n');

function run(name) {
  if (!checks[name]) throw new TypeError(`Unknown W10.8 contract check: ${name}.`);
  checks[name]();
}

function checkContexts() {
  const empty = createWorkspaceConsumerContext({ workspaceVersion: 0 });
  assert.equal(validateWorkspaceConsumerContext(empty).ok, true);
  assert.equal(empty.availabilitySummary.availableContractKeys.length, 0);
  assert.ok(Object.values(empty.contracts).every((value) => value === null));

  const fixture = buildWorkspaceConsumerFixture();
  const full = contextFor(fixture);
  assert.equal(validateWorkspaceConsumerContext(full).ok, true);
  assert.equal(full.availabilitySummary.availableContractKeys.length, 20);
  Object.entries(fixture.contracts).forEach(([key, value]) => assert.equal(full.contracts[key], value));
  full.contractReferences.forEach((row) => {
    assert.equal(row.semanticHash, full.contracts[row.contractKey]?.semanticHash || null);
  });
  assert.equal(contextFor(fixture).contextId, full.contextId);
  assert.equal(contextFor(fixture).semanticHash, full.semanticHash);

  const stale = contextFor(fixture, { topologyGraph: staleTopology(fixture.contracts.topologyGraph) });
  assert.equal(stale.contracts.topologyGraph, null);
  assert.ok(stale.diagnostics.some((row) => row.contractKey === 'topologyGraph' && row.code === 'STALE_CONTRACT_EVIDENCE'));
  const other = buildWorkspaceConsumerFixture({ datasetId: 'W10.8-OTHER' });
  const mixed = contextFor(fixture, { topologyGraph: other.contracts.topologyGraph });
  assert.equal(mixed.contracts.topologyGraph, null);
  assert.ok(mixed.diagnostics.some((row) => row.code === 'DATASET_MISMATCH'));
}

function checkRegistry() {
  const registry = createWorkspaceConsumerRegistry();
  assert.equal(validateWorkspaceConsumerRegistry(registry).ok, true);
  assert.deepEqual(registry.consumers.map((row) => row.consumerId).sort(), Object.values(CONSUMER_IDS).sort());
  assert.equal(workspaceConsumerDescriptor(registry, CONSUMER_IDS.WORKSPACE).implementationStatus, IMPLEMENTATION_STATUS.IMPLEMENTED);
  assert.equal(workspaceConsumerDescriptor(registry, CONSUMER_IDS.REPORTS).implementationStatus, IMPLEMENTATION_STATUS.IMPLEMENTED);
  [CONSUMER_IDS.LOAD_CALC, CONSUMER_IDS.THREE_D_CALC, CONSUMER_IDS.PIPE_SOLVER, CONSUMER_IDS.QA, CONSUMER_IDS.DEBUG]
    .forEach((id) => assert.equal(workspaceConsumerDescriptor(registry, id).implementationStatus, IMPLEMENTATION_STATUS.NOT_IMPLEMENTED));
  assert.throws(() => workspaceConsumerDescriptor(registry, 'UNKNOWN'), /Unknown workspace consumer/);
}

function checkReadiness() {
  const registry = createWorkspaceConsumerRegistry();
  const empty = createWorkspaceConsumerContext({ workspaceVersion: 0 });
  const blocked = createWorkspaceConsumerReadiness(registry, empty, CONSUMER_IDS.REPORTS, { workspaceBooted: true });
  assert.equal(blocked.readinessState, READINESS_STATES.BLOCKED_MISSING_CONTRACTS);
  assert.equal(validateWorkspaceConsumerReadiness(blocked).ok, true);

  const fixture = buildWorkspaceConsumerFixture();
  const full = contextFor(fixture);
  const available = createWorkspaceConsumerReadiness(registry, full, CONSUMER_IDS.REPORTS, { workspaceBooted: true });
  assert.equal(available.readinessState, READINESS_STATES.AVAILABLE);

  const brokenLedger = deepFreeze({ ...fixture.contracts.modelCalculationLedger, semanticHash: 'sha256:broken' });
  const invalid = contextFor(fixture, { modelCalculationLedger: brokenLedger });
  const invalidState = createWorkspaceConsumerReadiness(registry, invalid, CONSUMER_IDS.REPORTS, { workspaceBooted: true });
  assert.equal(invalidState.readinessState, READINESS_STATES.BLOCKED_INVALID_CONTRACTS);

  const future = createWorkspaceConsumerReadiness(registry, full, CONSUMER_IDS.PIPE_SOLVER, { workspaceBooted: true });
  assert.equal(future.readinessState, READINESS_STATES.NOT_IMPLEMENTED);
  assert.throws(() => createWorkspaceConsumerReadiness(registry, full, 'UNKNOWN'), /Unknown workspace consumer/);
}

function checkViews() {
  const registry = createWorkspaceConsumerRegistry();
  const empty = createWorkspaceConsumerContext({ workspaceVersion: 0 });
  const emptyReadiness = readinessRows(registry, empty);
  const initial = createApplicationViewState(emptyReadiness);
  assert.equal(initial.activeViewId, CONSUMER_IDS.WORKSPACE);
  assert.equal(validateApplicationViewState(initial).ok, true);
  const blocked = transitionApplicationViewState(initial, CONSUMER_IDS.REPORTS, emptyReadiness);
  assert.equal(blocked.activated, false);
  assert.equal(blocked.state.activeViewId, CONSUMER_IDS.WORKSPACE);

  const fixture = buildWorkspaceConsumerFixture();
  const fullReadiness = readinessRows(registry, contextFor(fixture));
  const reports = transitionApplicationViewState(initial, CONSUMER_IDS.REPORTS, fullReadiness);
  assert.equal(reports.activated, true);
  assert.equal(reports.state.activeViewId, CONSUMER_IDS.REPORTS);

  const replacement = createWorkspaceConsumerContext({ datasetId: fixture.contracts.sharedModel.project.datasetId, workspaceVersion: 2 });
  const reset = refreshApplicationViewState(reports.state, readinessRows(registry, replacement));
  assert.equal(reset.activeViewId, CONSUMER_IDS.WORKSPACE);
  assert.throws(() => transitionApplicationViewState(initial, 'UNKNOWN', emptyReadiness), /Unknown application view/);
}

function checkImmutability() {
  const fixture = buildWorkspaceConsumerFixture();
  const sourceBefore = fixture.contracts.sharedModel.semanticHash;
  const context = contextFor(fixture);
  assertDeepFrozen(context);
  assertDeepFrozen(createWorkspaceConsumerRegistry());
  assertDeepFrozen(readinessRows(createWorkspaceConsumerRegistry(), context));
  assertDeepFrozen(createApplicationViewState(readinessRows(createWorkspaceConsumerRegistry(), context)));
  assert.equal(fixture.contracts.sharedModel.semanticHash, sourceBefore);
  assert.equal(context.contracts.sharedModel, fixture.contracts.sharedModel);
}

function contextFor(fixture, overrides = {}, selectedEntityId = 'COMP-1') {
  return createWorkspaceConsumerContext({
    datasetId: fixture.contracts.sharedModel.project.datasetId,
    workspaceVersion: 1,
    selectedEntityId,
    contracts: { ...fixture.contracts, ...overrides },
  });
}
function readinessRows(registry, context) {
  return registry.consumers.map((row) => createWorkspaceConsumerReadiness(registry, context, row.consumerId, { workspaceBooted: true }));
}
function staleTopology(graph) {
  const { semanticHash: _hash, ...base } = structuredClone(graph);
  const stale = { ...base, sharedModelSemanticHash: 'sha256:stale-shared-model' };
  return deepFreeze({ ...stale, semanticHash: semanticHash(stale) });
}
function assertDeepFrozen(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value); assert.equal(Object.isFrozen(value), true);
  Object.values(value).forEach((child) => assertDeepFrozen(child, seen));
}
