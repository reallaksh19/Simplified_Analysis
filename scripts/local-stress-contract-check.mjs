import assert from 'node:assert/strict';
import { calculateLocalStressFoundation } from '../src/core/local-stress/index.js';
import {
  createWorkspaceConsumerRegistryV4,
  createWorkspaceConsumerRegistryV5,
  validateWorkspaceConsumerRegistryV4,
  validateWorkspaceConsumerRegistryV5,
  workspaceConsumerDescriptor,
} from '../src/core/workspace-consumers/registry.js';

const result = calculateLocalStressFoundation({
  actionSense: 'SUPPORT_ON_PIPE',
  axialDirection: [1, 0, 0],
  radialDirection: [0, 0, 1],
  sourcePoint: [0, 0, 1000],
  targetPoint: [0, 0, 0],
  force: [1000, 0, 0],
  moment: [0, 0, 0],
  outsideDiameter: 1000,
  nominalThickness: 10,
  corrosionAllowance: 0,
  internalPressure: 2,
  externalPressure: 0,
  endCondition: 'CLOSED_END',
});

assert.deepEqual(result.loadResult.targetMomentGlobal, [0, 1_000_000, 0]);
assert.deepEqual(result.loadResult.targetMomentLocal, [0, 1_000_000, 0]);
approx(result.pressureResult.coefficientA, 48.505050505050505);
approx(result.pressureResult.coefficientB, 12_126_262.626262626);
approx(result.pressureResult.inner.radialStress, -2);
approx(result.pressureResult.outer.radialStress, 0);
approx(result.pressureResult.inner.hoopStress, 99.01010101010101);
assert.equal(result.pressureResult.axialPressureStress, result.pressureResult.coefficientA);
assert.equal(result.qualification.engineeringLevel, 'LOAD_TRANSFER_AND_PRESSURE_BASELINE_ONLY');
assert.ok(result.limitations.includes('NO_LOCAL_ATTACHMENT_STRESS'));
assert.ok(Object.isFrozen(result));
assert.ok(Object.isFrozen(result.loadResult));

assert.throws(() => calculateLocalStressFoundation({
  ...result.input,
  radialDirection: [1, 1e-14, 0],
}), /near-collinear/);

const v4 = createWorkspaceConsumerRegistryV4();
const v5 = createWorkspaceConsumerRegistryV5();
assert.equal(validateWorkspaceConsumerRegistryV4(v4).ok, true);
assert.equal(validateWorkspaceConsumerRegistryV5(v5).ok, true);
assert.equal(v4.consumers.some((row) => row.consumerId === 'LOCAL_STRESS'), false);
const descriptor = workspaceConsumerDescriptor(v5, 'LOCAL_STRESS');
assert.equal(descriptor.label, 'Local stress');
assert.equal(descriptor.implementationStatus, 'IMPLEMENTED');
assert.deepEqual(descriptor.requiredContractKeys, []);
assert.equal(descriptor.engineeringClaimPolicy, 'LOAD_TRANSFER_AND_PRESSURE_BASELINE_ONLY');

console.log('Local stress foundation contract checks passed.');

function approx(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
}
