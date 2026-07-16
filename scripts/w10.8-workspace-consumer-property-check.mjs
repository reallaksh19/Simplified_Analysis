import assert from 'node:assert/strict';
import { createWorkspaceConsumerContext, createWorkspaceConsumerReadiness, createWorkspaceConsumerRegistry } from '../src/core/workspace-consumers/index.js';

console.log('\n--- W10.8 workspace consumer properties ---\n');
const registry = createWorkspaceConsumerRegistry();
const contracts = {
  sharedModel: frozenContract('shared-piping-model/v1', 'D1', 'shared'),
  topologyGraph: frozenContract('piping-topology-graph/v1', 'D1', 'topology'),
  topologyAudit: frozenContract('piping-topology-audit/v1', 'D1', 'audit'),
};
const baseline = createWorkspaceConsumerContext({ datasetId: 'D1', workspaceVersion: 7, selectedEntityId: 'PIPE-1', contracts });
for (let seed = 1; seed <= 25; seed += 1) {
  const shuffled = Object.fromEntries(shuffle(Object.entries(contracts), seed));
  const context = createWorkspaceConsumerContext({ datasetId: 'D1', workspaceVersion: 7, selectedEntityId: 'PIPE-1', contracts: shuffled });
  assert.equal(context.contextId, baseline.contextId);
  assert.equal(context.semanticHash, baseline.semanticHash);
  assert.deepEqual(context.contractReferences, baseline.contractReferences);
  assert.equal(createWorkspaceConsumerReadiness(registry, context, 'QA').semanticHash, createWorkspaceConsumerReadiness(registry, baseline, 'QA').semanticHash);
}
const selectionChanged = createWorkspaceConsumerContext({ datasetId: 'D1', workspaceVersion: 8, selectedEntityId: 'PIPE-2', contracts });
assert.notEqual(selectionChanged.contextId, baseline.contextId);
assert.equal(selectionChanged.contracts.sharedModel, baseline.contracts.sharedModel);
assert.equal(selectionChanged.contracts.topologyGraph.semanticHash, baseline.contracts.topologyGraph.semanticHash);
const reversedRegistry = createWorkspaceConsumerRegistry([...registry.consumers].reverse());
assert.equal(reversedRegistry.semanticHash, registry.semanticHash);
console.log('✅ W10.8 workspace consumer properties passed.\n');

function frozenContract(schema, datasetId, name) { return Object.freeze({ schema, datasetId, semanticHash: `sha256:${name}` }); }
function shuffle(values, seed) {
  const rows = [...values]; let state = seed;
  for (let index = rows.length - 1; index > 0; index -= 1) { state = (state * 1664525 + 1013904223) >>> 0; const swap = state % (index + 1); [rows[index], rows[swap]] = [rows[swap], rows[index]]; }
  return rows;
}