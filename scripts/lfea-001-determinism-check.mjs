import assert from 'node:assert/strict';
import { solveContinuumModel } from '../src/core/element-fea/index.js';
import { baseModel, clone } from './lfea-001-fixtures.mjs';
const first=solveContinuumModel(baseModel());
const reordered=clone(baseModel()); reordered.nodes.reverse(); reordered.materials.reverse(); reordered.restraints.reverse(); reordered.prescribedDisplacements.reverse();
const second=solveContinuumModel(reordered);
assert.equal(first.status,'QUALIFIED'); assert.equal(second.status,'QUALIFIED'); assert.equal(first.semanticHash,second.semanticHash);
assert.ok(Object.isFrozen(first)); assert.ok(Object.isFrozen(first.nodalDisplacements));
console.log(`LFEA-001 deterministic semantic hash passed: ${first.semanticHash}`);
