import assert from 'node:assert/strict';
import { createPipeSolverReviewModel } from '../src/core/pipe-solver-consumer/index.js';
import { buildW1011Fixture } from './w10.11-fixtures.mjs';

console.log('\n--- W10.11 deterministic properties ---\n');
const normal = buildW1011Fixture({status:'completed',diagnostics:[
  {severity:'WARNING',code:'Z_DIAGNOSTIC',message:'Zulu',details:{}},
  {severity:'INFO',code:'A_DIAGNOSTIC',message:'Alpha',details:{}},
]});
const reordered = buildW1011Fixture({status:'completed',reverseInputs:true,diagnostics:[
  {severity:'INFO',code:'A_DIAGNOSTIC',message:'Alpha',details:{}},
  {severity:'WARNING',code:'Z_DIAGNOSTIC',message:'Zulu',details:{}},
]});
assert.equal(normal.review.reviewModelId, reordered.review.reviewModelId);
assert.equal(normal.review.semanticHash, reordered.review.semanticHash);
assert.deepEqual(normal.review.inputRows.map((row)=>row.key), reordered.review.inputRows.map((row)=>row.key));
assert.deepEqual(normal.review.diagnostics, reordered.review.diagnostics);
assert.deepEqual(normal.review.ledgerRows.map((row)=>row.sequence), [1,2]);
assert.strictEqual(normal.review.currentResult, normal.session.result);

const changedSelection = buildW1011Fixture({selectedEntityId:'PIPE-2',sessionMismatch:true});
assert.equal(changedSelection.review.sessionSummary, null);
const changedDataset = buildW1011Fixture({datasetId:'W10.11-OTHER',sessionDatasetId:'STALE',status:'completed'});
assert.equal(changedDataset.review.sessionSummary, null);
assert.equal(changedDataset.review.currentResult, null);

const rebuilt = createPipeSolverReviewModel(normal.source);
assert.equal(rebuilt.reviewModelId, normal.review.reviewModelId);
assert.equal(rebuilt.semanticHash, normal.review.semanticHash);
console.log('✅ W10.11 deterministic property checks passed.');
