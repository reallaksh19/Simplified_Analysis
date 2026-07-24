import assert from 'node:assert/strict';
import {
  createWorkspaceConsumerRegistry, createWorkspaceConsumerRegistryV2,
  createWorkspaceConsumerRegistryV3, createWorkspaceConsumerRegistryV4,
  createWorkspaceConsumerRegistryV5,
} from '../src/core/workspace-consumers/registry.js';
import { createWorkspaceConsumerReadinessRegistry } from '../src/core/workspace-consumers/readiness.js';
import { createApplicationViewStateV5, transitionApplicationViewStateV5, validateApplicationViewStateV5 } from '../src/core/workspace-consumers/view-state.js';

const expected = [
  'fnv1a64:933de417d77f43d2','fnv1a64:22f426d2b0677d92',
  'fnv1a64:496eed4568692dfa','fnv1a64:e47035052f70a27c',
];
const legacy = [createWorkspaceConsumerRegistry(),createWorkspaceConsumerRegistryV2(),createWorkspaceConsumerRegistryV3(),createWorkspaceConsumerRegistryV4()];
assert.deepEqual(legacy.map((row)=>row.semanticHash),expected);
const registry=createWorkspaceConsumerRegistryV5();
const context={semanticHash:'context:test',availabilitySummary:{availableContractKeys:[],invalidContractKeys:[]}};
const readiness=createWorkspaceConsumerReadinessRegistry(registry,context,{workspaceBooted:true});
const element=readiness.find((row)=>row.consumerId==='ELEMENT_FEA');
assert.equal(element.readinessState,'AVAILABLE');
let state=createApplicationViewStateV5(readiness,{activeViewId:'WORKSPACE'});
const transition=transitionApplicationViewStateV5(state,'ELEMENT_FEA',readiness);
assert.equal(transition.activated,true); state=transition.state;
assert.equal(state.schema,'application-view-state/v5'); assert.equal(state.activeViewId,'ELEMENT_FEA');
assert.equal(validateApplicationViewStateV5(state).ok,true);
console.log('LFEA-001 v1-v4 compatibility and v5 shell successor passed.');
