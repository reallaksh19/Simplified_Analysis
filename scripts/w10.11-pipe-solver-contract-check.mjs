import assert from 'node:assert/strict';
import {
  assessPipeSolverActions,
  createPipeSolverReviewModel,
  validatePipeSolverConsumerSource,
  validatePipeSolverReviewModel,
} from '../src/core/pipe-solver-consumer/index.js';
import {
  createApplicationViewStateV4,
  createWorkspaceConsumerReadinessRegistry,
  createWorkspaceConsumerRegistry,
  createWorkspaceConsumerRegistryV2,
  createWorkspaceConsumerRegistryV3,
  createWorkspaceConsumerRegistryV4,
  transitionApplicationViewStateV4,
  validateApplicationViewStateV4,
  validateWorkspaceConsumerRegistryV1,
  validateWorkspaceConsumerRegistryV2,
  validateWorkspaceConsumerRegistryV3,
  validateWorkspaceConsumerRegistryV4,
} from '../src/core/workspace-consumers/index.js';
import { buildW1011Fixture, emptyW1011Fixture } from './w10.11-fixtures.mjs';

const checks = {
  source: checkSource,
  selection: checkSelectionAndCapability,
  sessions: checkSessions,
  results: checkResults,
  ledger: checkLedger,
  evolution: checkEvolution,
  actions: checkActions,
  immutability: checkImmutability,
};
const selected = process.argv[2] || 'all';
console.log(`\n--- W10.11 Pipe Solver contracts · ${selected} ---\n`);
if (selected === 'all') Object.values(checks).forEach((check) => check());
else if (checks[selected]) checks[selected]();
else throw new TypeError(`Unknown W10.11 contract check: ${selected}.`);
console.log('✅ W10.11 Pipe Solver contract checks passed.');

function checkSource() {
  const empty = emptyW1011Fixture();
  assert.equal(validatePipeSolverConsumerSource(empty.source).ok, true);
  assert.equal(empty.source.datasetId, null);
  assert.equal(empty.source.selectedEntity, null);
  const fixture = buildW1011Fixture();
  assert.equal(validatePipeSolverConsumerSource(fixture.source).ok, true);
  assert.strictEqual(fixture.source.sourceContext, fixture.context);
  assert.strictEqual(fixture.source.selectedEntity.sourceAttributes, fixture.entity.properties.sourceAttributes);
  assert.strictEqual(fixture.source.selectedEntity.nativeParams, fixture.entity.properties.nativeParams);
  const forged = { ...fixture.source, contextSemanticHash: 'fnv1a64:forged' };
  assert.equal(validatePipeSolverConsumerSource(forged).ok, false);
}

function checkSelectionAndCapability() {
  const none = buildW1011Fixture({ selectedEntity:false });
  assert.equal(none.review.selection, null);
  assert.equal(none.review.capabilitySummary.readyToReview, false);
  const nonPipe = buildW1011Fixture({ entityType:'SUPPORT', session:false });
  assert.equal(nonPipe.review.capabilitySummary.applicable, false);
  const missing = buildW1011Fixture({ ready:false });
  assert.equal(missing.review.capabilitySummary.readyToReview, true);
  assert.equal(missing.review.capabilitySummary.readyToRun, false);
  assert.deepEqual(missing.review.inputRows.map((row)=>row.key).sort(), ['E','Sa','alpha','connectedLineSegments','deltaT','od'].sort());
  const ready = buildW1011Fixture();
  assert.equal(ready.review.capabilitySummary.readyToRun, true);
  assert.equal(ready.review.capabilitySummary.solverId, 'workspace-simplified-2d-screening');
  assert.equal(ready.review.capabilitySummary.methodId, 'SIMPLIFIED_2D_TOPOLOGY_SCREENING');
}

function checkSessions() {
  for (const status of ['draft','ready','running','completed','failed']) {
    const fixture = buildW1011Fixture({ ready:status!=='draft', status });
    assert.equal(fixture.review.sessionSummary.status, status);
    assert.strictEqual(fixture.review.sessionSummary.sourceSession, fixture.session);
  }
  const mismatch = buildW1011Fixture({ sessionMismatch:true });
  assert.equal(mismatch.source.activeSession, null);
  assert.ok(mismatch.source.diagnostics.some((row)=>row.code==='PIPE_SOLVER_SESSION_MISMATCH'));
  const wrongDataset = buildW1011Fixture({ sessionDatasetId:'OTHER' });
  assert.equal(wrongDataset.source.activeSession, null);
}

function checkResults() {
  const valid = buildW1011Fixture({ status:'completed' });
  assert.strictEqual(valid.review.currentResult, valid.session.result);
  assert.equal(valid.review.currentResult.schemaVersion, 'solver-result-contract-v1');
  const invalid = buildW1011Fixture({ status:'completed', invalidResult:true });
  assert.equal(invalid.review.currentResult, null);
  assert.ok(invalid.review.diagnostics.some((row)=>row.code==='PIPE_SOLVER_RESULT_INVALID'));
  const failed = buildW1011Fixture({ status:'failed' });
  assert.equal(failed.review.currentResult, null);
  assert.equal(failed.review.sessionSummary.failure.code, 'PIPE_SCREENING_FAILED');
}

function checkLedger() {
  const fixture = buildW1011Fixture({ status:'completed', includeOtherLedger:true, activeEntryId:'entry-2' });
  assert.deepEqual(fixture.source.matchingLedgerEntries.map((row)=>row.entryId), ['entry-1','entry-2']);
  assert.equal(fixture.source.activeMatchingLedgerEntryId, 'entry-2');
  assert.deepEqual(fixture.review.ledgerRows.map((row)=>row.sequence), [1,2]);
  assert.strictEqual(fixture.review.ledgerRows[0].sourceEntry, fixture.source.matchingLedgerEntries[0]);
  const wrong = buildW1011Fixture({ status:'completed', ledgerDatasetId:'OTHER' });
  assert.equal(wrong.source.matchingLedgerEntries.length, 2);
  assert.ok(wrong.source.diagnostics.some((row)=>row.code==='PIPE_SOLVER_LEDGER_DATASET_MISMATCH'));
}

function checkEvolution() {
  assert.equal(validateWorkspaceConsumerRegistryV1(createWorkspaceConsumerRegistry()).ok, true);
  assert.equal(validateWorkspaceConsumerRegistryV2(createWorkspaceConsumerRegistryV2()).ok, true);
  assert.equal(validateWorkspaceConsumerRegistryV3(createWorkspaceConsumerRegistryV3()).ok, true);
  const registry = createWorkspaceConsumerRegistryV4();
  assert.equal(validateWorkspaceConsumerRegistryV4(registry).ok, true);
  const pipe = registry.consumers.find((row)=>row.consumerId==='PIPE_SOLVER');
  assert.equal(pipe.implementationStatus, 'IMPLEMENTED');
  assert.equal(pipe.engineeringClaimPolicy, 'EXISTING_BENCHMARKED_SIMPLIFIED_2D_SCREENING_ONLY');
  const context = buildW1011Fixture().context;
  const readiness = createWorkspaceConsumerReadinessRegistry(registry, context, {workspaceBooted:true});
  assert.equal(readiness.find((row)=>row.consumerId==='PIPE_SOLVER').readinessState, 'AVAILABLE');
  const initial = createApplicationViewStateV4(readiness);
  const activated = transitionApplicationViewStateV4(initial,'PIPE_SOLVER',readiness);
  assert.equal(activated.activated, true);
  assert.equal(activated.state.schema, 'application-view-state/v4');
  assert.equal(validateApplicationViewStateV4(activated.state).ok, true);
}

function checkActions() {
  const noSession = buildW1011Fixture({session:false}).review;
  assert.equal(assessPipeSolverActions(noSession).OPEN_PIPE_SCREENING_SESSION, true);
  const draft = buildW1011Fixture({ready:false,status:'draft'}).review;
  assert.equal(assessPipeSolverActions(draft).RESET_PIPE_SCREENING_SESSION, true);
  assert.equal(assessPipeSolverActions(draft).RUN_PIPE_SCREENING, false);
  const ready = buildW1011Fixture({status:'ready'}).review;
  assert.equal(assessPipeSolverActions(ready).RUN_PIPE_SCREENING, true);
  const completed = buildW1011Fixture({status:'completed'}).review;
  assert.equal(assessPipeSolverActions(completed).EXPORT_ANALYSIS_LEDGER, true);
  assert.equal(assessPipeSolverActions(completed).CLOSE_PIPE_SCREENING_SESSION, true);
}

function checkImmutability() {
  const fixture = buildW1011Fixture({status:'completed'});
  assert.equal(Object.isFrozen(fixture.source), true);
  assert.equal(Object.isFrozen(fixture.review), true);
  assert.equal(Object.isFrozen(fixture.review.inputRows), true);
  assert.equal(validatePipeSolverReviewModel(fixture.review).ok, true);
  const forged = { ...fixture.review, summary:{...fixture.review.summary,readyToRun:false} };
  assert.equal(validatePipeSolverReviewModel(forged).ok, false);
  assert.deepEqual(createPipeSolverReviewModel(fixture.source), fixture.review);
}
