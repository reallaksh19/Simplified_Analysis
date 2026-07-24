import assert from 'node:assert/strict';
import {
  FORMULA_IDS,
  calculateLocalStressFoundation,
} from '../src/core/local-stress/index.js';

const result = calculateLocalStressFoundation(validInput());

assert.deepEqual(result.loadResult.targetMomentGlobal, [0, 1_000_000, 0]);
assertVectorNearZero(result.loadResult.forceReconstructionResidualGlobal);
assertVectorNearZero(result.loadResult.momentReconstructionResidualGlobal);
assertVectorNearZero(result.loadResult.commonOriginMomentResidualGlobal);
assertNear(result.pressureResult.coefficientA, 48.505050505050505);
assertNear(result.pressureResult.coefficientB, 12_126_262.626262626);
assertNear(result.pressureResult.inner.radialStress, -2);
assertNear(result.pressureResult.outer.radialStress, 0);
assertNear(result.pressureResult.inner.hoopStress, 99.01010101010101);
assert.equal(result.pressureResult.boundaryAssessment.accepted, true);
assert.equal(result.qualification.status, 'PROTOTYPE_ONLY');
assert.ok(result.limitations.includes('NON_CANONICAL_CORE_PROTOTYPE'));
assert.ok(Object.isFrozen(result));
assert.ok(Object.isFrozen(result.loadResult));

const openEnd = calculateLocalStressFoundation({
  ...validInput(),
  force: [-0, 0, 0],
  endCondition: 'OPEN_END',
});
assert.equal(openEnd.pressureResult.axialPressureStress, 0);
assert.ok(openEnd.formulaTrace.includes(FORMULA_IDS.OPEN_END_AXIAL));
assert.equal(openEnd.formulaTrace.includes(FORMULA_IDS.CLOSED_END_AXIAL), false);
assert.equal(JSON.stringify(openEnd).includes('-0'), false);

for (const invalidValue of [null, false, '', '  ']) {
  assert.throws(
    () => calculateLocalStressFoundation({ ...validInput(), internalPressure: invalidValue }),
    /finite number/,
  );
}

assert.throws(
  () => calculateLocalStressFoundation({
    ...validInput(),
    radialDirection: [1, 1e-14, 0],
  }),
  /near-collinear/,
);

console.log('Local stress core prototype smoke checks passed.');

function validInput() {
  return {
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
  };
}

function assertNear(actual, expected) {
  const scale = Math.max(1, Math.abs(actual), Math.abs(expected));
  assert.ok(Math.abs(actual - expected) <= 1e-10 * scale, `${actual} differs from ${expected}`);
}

function assertVectorNearZero(value) {
  value.forEach((component) => assertNear(component, 0));
}
