import { deepFreeze, semanticHash } from '../shared-piping-model/index.js';
import {
  ACTION_SENSES,
  ENGINEERING_LEVEL,
  FORMULA_IDS,
  LIMITATIONS,
  LOCAL_STRESS_INPUT_SCHEMA,
  LOCAL_STRESS_RESULT_SCHEMA,
  PRESSURE_END_CONDITIONS,
} from './constants.js';
import {
  add,
  cross,
  dot,
  finite,
  norm,
  normalize,
  scale,
  subtract,
  transformRows,
  vector3,
} from './vector-math.js';

const FRAME_DEGENERACY_LIMIT = 1e-10;

export function calculateLocalStressFoundation(input) {
  const model = normalizeInput(input);
  const coordinateSystem = createPipeLocalFrame(model.axialDirection, model.radialDirection);
  const loadResult = calculateLoadResult(model, coordinateSystem.rotationGlobalToLocal);
  const pressureResult = calculatePressureResult(model);
  const base = {
    schema: LOCAL_STRESS_RESULT_SCHEMA,
    inputSchema: LOCAL_STRESS_INPUT_SCHEMA,
    qualification: deepFreeze({ status: 'ACCEPTED', engineeringLevel: ENGINEERING_LEVEL }),
    units: deepFreeze({ length: 'mm', force: 'N', moment: 'N·mm', pressure: 'MPa', stress: 'MPa' }),
    input: model,
    coordinateSystem,
    loadResult,
    pressureResult,
    formulaTrace: deepFreeze(Object.values(FORMULA_IDS).sort()),
    limitations: LIMITATIONS,
  };
  return deepFreeze({ ...base, semanticHash: semanticHash(base) });
}

function normalizeInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Local-stress input must be an object.');
  const actionSense = enumValue(input.actionSense, ACTION_SENSES, 'actionSense');
  const endCondition = enumValue(input.endCondition, PRESSURE_END_CONDITIONS, 'endCondition');
  const outsideDiameter = positive(input.outsideDiameter, 'outsideDiameter');
  const nominalThickness = positive(input.nominalThickness, 'nominalThickness');
  const corrosionAllowance = nonNegative(input.corrosionAllowance, 'corrosionAllowance');
  if (corrosionAllowance >= nominalThickness) throw new TypeError('corrosionAllowance must be less than nominalThickness.');
  const assessmentThickness = nominalThickness - corrosionAllowance;
  if (assessmentThickness >= outsideDiameter / 2) throw new TypeError('Assessment thickness must leave a positive inner radius.');
  return deepFreeze({
    schema: LOCAL_STRESS_INPUT_SCHEMA,
    actionSense,
    axialDirection: vector3(input.axialDirection, 'axialDirection'),
    radialDirection: vector3(input.radialDirection, 'radialDirection'),
    sourcePoint: vector3(input.sourcePoint, 'sourcePoint'),
    targetPoint: vector3(input.targetPoint, 'targetPoint'),
    force: vector3(input.force, 'force'),
    moment: vector3(input.moment, 'moment'),
    outsideDiameter,
    nominalThickness,
    corrosionAllowance,
    assessmentThickness,
    internalPressure: nonNegative(input.internalPressure, 'internalPressure'),
    externalPressure: nonNegative(input.externalPressure, 'externalPressure'),
    endCondition,
  });
}

function createPipeLocalFrame(axialDirection, radialDirection) {
  const eX = normalize(axialDirection, 'axialDirection');
  const radialProjection = subtract(radialDirection, scale(eX, dot(radialDirection, eX)));
  const conditioning = norm(radialProjection) / norm(radialDirection);
  if (!Number.isFinite(conditioning) || conditioning <= FRAME_DEGENERACY_LIMIT) {
    throw new TypeError('radialDirection is collinear or near-collinear with axialDirection.');
  }
  const eZ = normalize(radialProjection, 'projected radialDirection');
  const eY = normalize(cross(eZ, eX), 'circumferential direction');
  const rotationGlobalToLocal = deepFreeze([eX, eY, eZ].map((row) => deepFreeze(row)));
  const handedness = dot(cross(eX, eY), eZ);
  if (handedness <= 0) throw new TypeError('Pipe-local coordinate frame is not right-handed.');
  return deepFreeze({
    origin: null,
    eX: deepFreeze(eX),
    eY: deepFreeze(eY),
    eZ: deepFreeze(eZ),
    rotationGlobalToLocal,
    conditioning,
    handedness,
    orthogonalityResidual: Math.max(Math.abs(dot(eX, eY)), Math.abs(dot(eY, eZ)), Math.abs(dot(eZ, eX))),
    formulaId: FORMULA_IDS.BASIS_ORTHOGONALIZATION,
  });
}

function calculateLoadResult(model, rotation) {
  const leverArm = subtract(model.sourcePoint, model.targetPoint);
  const transferredMoment = add(model.moment, cross(leverArm, model.force));
  const localForce = transformRows(rotation, model.force);
  const localMoment = transformRows(rotation, transferredMoment);
  return deepFreeze({
    actionSense: model.actionSense,
    sourcePoint: model.sourcePoint,
    targetPoint: model.targetPoint,
    leverArm: deepFreeze(leverArm),
    sourceForceGlobal: model.force,
    sourceMomentGlobal: model.moment,
    targetForceGlobal: model.force,
    targetMomentGlobal: deepFreeze(transferredMoment),
    targetForceLocal: deepFreeze(localForce),
    targetMomentLocal: deepFreeze(localMoment),
    forceMagnitudeResidual: Math.abs(norm(model.force) - norm(localForce)),
    formulaIds: deepFreeze([FORMULA_IDS.MOMENT_TRANSFER, FORMULA_IDS.GLOBAL_TO_LOCAL]),
  });
}

function calculatePressureResult(model) {
  const outerRadius = model.outsideDiameter / 2;
  const innerRadius = outerRadius - model.assessmentThickness;
  const denominator = outerRadius ** 2 - innerRadius ** 2;
  const a = (model.internalPressure * innerRadius ** 2 - model.externalPressure * outerRadius ** 2) / denominator;
  const b = ((model.internalPressure - model.externalPressure) * innerRadius ** 2 * outerRadius ** 2) / denominator;
  const at = (radius) => deepFreeze({
    radius,
    radialStress: a - b / radius ** 2,
    hoopStress: a + b / radius ** 2,
  });
  const axialPressureStress = model.endCondition === PRESSURE_END_CONDITIONS.CLOSED_END ? a : 0;
  const inner = at(innerRadius);
  const outer = at(outerRadius);
  return deepFreeze({
    innerRadius,
    outerRadius,
    assessmentThickness: model.assessmentThickness,
    internalPressure: model.internalPressure,
    externalPressure: model.externalPressure,
    endCondition: model.endCondition,
    coefficientA: a,
    coefficientB: b,
    axialPressureStress,
    inner,
    outer,
    boundaryResiduals: deepFreeze({
      inner: inner.radialStress + model.internalPressure,
      outer: outer.radialStress + model.externalPressure,
    }),
    formulaIds: deepFreeze([
      FORMULA_IDS.LAME_A,
      FORMULA_IDS.LAME_B,
      FORMULA_IDS.RADIAL_STRESS,
      FORMULA_IDS.HOOP_STRESS,
      ...(model.endCondition === PRESSURE_END_CONDITIONS.CLOSED_END ? [FORMULA_IDS.CLOSED_END_AXIAL] : []),
    ]),
  });
}

function enumValue(value, enumeration, label) {
  if (!Object.values(enumeration).includes(value)) throw new TypeError(`${label} is invalid.`);
  return value;
}
function positive(value, label) { const number = finite(value, label); if (number <= 0) throw new TypeError(`${label} must be greater than zero.`); return number; }
function nonNegative(value, label) { const number = finite(value, label); if (number < 0) throw new TypeError(`${label} must be zero or greater.`); return number; }
