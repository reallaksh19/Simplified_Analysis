import { deepFreeze, semanticHash } from '../shared-piping-model/index.js';
import {
  ACTION_SENSES,
  ENGINEERING_LEVEL,
  FORMULA_IDS,
  LIMITATIONS,
  LOCAL_STRESS_INPUT_SCHEMA,
  LOCAL_STRESS_RESULT_SCHEMA,
  NUMERICAL_PROFILE,
  PRESSURE_END_CONDITIONS,
} from './constants.js';
import {
  add,
  canonicalNumber,
  cross,
  dot,
  finite,
  norm,
  normalize,
  scale,
  subtract,
  transformColumns,
  transformRows,
  vector3,
} from './vector-math.js';

export function calculateLocalStressFoundation(input) {
  const model = normalizeInput(input);
  const coordinateSystem = createPipeLocalFrame(model);
  const loadResult = calculateLoadResult(model, coordinateSystem);
  const pressureResult = calculatePressureResult(model);
  const formulaTrace = executedFormulaTrace(coordinateSystem, loadResult, pressureResult);
  const base = {
    schema: LOCAL_STRESS_RESULT_SCHEMA,
    inputSchema: LOCAL_STRESS_INPUT_SCHEMA,
    qualification: deepFreeze({ status: 'PROTOTYPE_ONLY', engineeringLevel: ENGINEERING_LEVEL }),
    units: deepFreeze({ length: 'mm', force: 'N', moment: 'N·mm', pressure: 'MPa', stress: 'MPa' }),
    input: model,
    coordinateSystem,
    loadResult,
    pressureResult,
    formulaTrace,
    limitations: LIMITATIONS,
  };
  return deepFreeze({ ...base, semanticHash: semanticHash(base) });
}

function normalizeInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Local-stress input must be an object.');
  }
  const outsideDiameter = positive(input.outsideDiameter, 'outsideDiameter');
  const nominalThickness = positive(input.nominalThickness, 'nominalThickness');
  const corrosionAllowance = nonNegative(input.corrosionAllowance, 'corrosionAllowance');
  if (corrosionAllowance >= nominalThickness) {
    throw new TypeError('corrosionAllowance must be less than nominalThickness.');
  }
  const assessmentThickness = canonicalNumber(nominalThickness - corrosionAllowance);
  if (assessmentThickness >= outsideDiameter / 2) {
    throw new TypeError('Assessment thickness must leave a positive inner radius.');
  }
  return deepFreeze({
    schema: LOCAL_STRESS_INPUT_SCHEMA,
    actionSense: enumValue(input.actionSense, ACTION_SENSES, 'actionSense'),
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
    endCondition: enumValue(input.endCondition, PRESSURE_END_CONDITIONS, 'endCondition'),
  });
}

function createPipeLocalFrame(model) {
  const eX = normalize(model.axialDirection, 'axialDirection');
  const radialProjection = subtract(model.radialDirection, scale(eX, dot(model.radialDirection, eX)));
  const conditioning = canonicalNumber(norm(radialProjection) / norm(model.radialDirection));
  if (conditioning <= NUMERICAL_PROFILE.minimumFrameSine) {
    throw new TypeError('radialDirection is collinear or near-collinear with axialDirection.');
  }
  const eZ = normalize(radialProjection, 'projected radialDirection');
  const eY = normalize(cross(eZ, eX), 'circumferential direction');
  const rotationGlobalToLocal = deepFreeze([eX, eY, eZ].map((row) => deepFreeze(row)));
  const handedness = dot(cross(eX, eY), eZ);
  if (handedness <= 0) throw new TypeError('Pipe-local coordinate frame is not right-handed.');
  return deepFreeze({
    origin: model.targetPoint,
    eX: deepFreeze(eX),
    eY: deepFreeze(eY),
    eZ: deepFreeze(eZ),
    rotationGlobalToLocal,
    conditioning,
    handedness,
    orthogonalityResidual: orthogonalityResidual(eX, eY, eZ),
    numericalProfile: NUMERICAL_PROFILE,
    formulaIds: deepFreeze([FORMULA_IDS.BASIS_ORTHOGONALIZATION]),
  });
}

function calculateLoadResult(model, coordinateSystem) {
  const leverArm = subtract(model.sourcePoint, model.targetPoint);
  const transferredMoment = add(model.moment, cross(leverArm, model.force));
  const localForce = transformRows(coordinateSystem.rotationGlobalToLocal, model.force);
  const localMoment = transformRows(coordinateSystem.rotationGlobalToLocal, transferredMoment);
  const reconstructedForce = transformColumns(coordinateSystem.rotationGlobalToLocal, localForce);
  const reconstructedMoment = transformColumns(coordinateSystem.rotationGlobalToLocal, localMoment);
  const sourceOriginMoment = momentAboutOrigin(model.moment, model.sourcePoint, model.force, coordinateSystem.origin);
  const targetOriginMoment = momentAboutOrigin(transferredMoment, model.targetPoint, model.force, coordinateSystem.origin);
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
    forceReconstructionResidualGlobal: deepFreeze(subtract(reconstructedForce, model.force)),
    momentReconstructionResidualGlobal: deepFreeze(subtract(reconstructedMoment, transferredMoment)),
    commonOriginMomentResidualGlobal: deepFreeze(subtract(targetOriginMoment, sourceOriginMoment)),
    formulaIds: deepFreeze([
      FORMULA_IDS.FORCE_TRANSFER,
      FORMULA_IDS.MOMENT_TRANSFER,
      FORMULA_IDS.GLOBAL_TO_LOCAL,
    ]),
  });
}

function calculatePressureResult(model) {
  const outerRadius = canonicalNumber(model.outsideDiameter / 2);
  const innerRadius = canonicalNumber(outerRadius - model.assessmentThickness);
  const denominator = canonicalNumber(outerRadius ** 2 - innerRadius ** 2);
  const a = canonicalNumber(
    (model.internalPressure * innerRadius ** 2 - model.externalPressure * outerRadius ** 2)
      / denominator,
  );
  const b = canonicalNumber(
    ((model.internalPressure - model.externalPressure) * innerRadius ** 2 * outerRadius ** 2)
      / denominator,
  );
  const inner = pressureAt(innerRadius, a, b);
  const outer = pressureAt(outerRadius, a, b);
  const boundaryResiduals = pressureBoundaryResiduals(model, inner, outer);
  const axialPressureStress = model.endCondition === PRESSURE_END_CONDITIONS.CLOSED_END ? a : 0;
  return deepFreeze({
    innerRadius,
    outerRadius,
    assessmentThickness: model.assessmentThickness,
    internalPressure: model.internalPressure,
    externalPressure: model.externalPressure,
    endCondition: model.endCondition,
    coefficientA: a,
    coefficientB: b,
    axialPressureStress: canonicalNumber(axialPressureStress),
    inner,
    outer,
    boundaryResiduals,
    boundaryAssessment: pressureBoundaryAssessment(model, boundaryResiduals),
    numericalProfile: NUMERICAL_PROFILE,
    formulaIds: pressureFormulaIds(model.endCondition),
  });
}

function pressureAt(radius, a, b) {
  return deepFreeze({
    radius,
    radialStress: canonicalNumber(a - b / radius ** 2),
    hoopStress: canonicalNumber(a + b / radius ** 2),
  });
}

function pressureBoundaryResiduals(model, inner, outer) {
  return deepFreeze({
    inner: canonicalNumber(inner.radialStress + model.internalPressure),
    outer: canonicalNumber(outer.radialStress + model.externalPressure),
  });
}

function pressureBoundaryAssessment(model, residuals) {
  const innerTolerance = stressTolerance(model.internalPressure);
  const outerTolerance = stressTolerance(model.externalPressure);
  return deepFreeze({
    innerToleranceMpa: innerTolerance,
    outerToleranceMpa: outerTolerance,
    accepted: Math.abs(residuals.inner) <= innerTolerance && Math.abs(residuals.outer) <= outerTolerance,
  });
}

function pressureFormulaIds(endCondition) {
  const axialFormula = endCondition === PRESSURE_END_CONDITIONS.CLOSED_END
    ? FORMULA_IDS.CLOSED_END_AXIAL
    : FORMULA_IDS.OPEN_END_AXIAL;
  return deepFreeze([
    FORMULA_IDS.LAME_A,
    FORMULA_IDS.LAME_B,
    FORMULA_IDS.RADIAL_STRESS,
    FORMULA_IDS.HOOP_STRESS,
    axialFormula,
  ]);
}

function momentAboutOrigin(moment, point, force, origin) {
  return add(moment, cross(subtract(point, origin), force));
}

function executedFormulaTrace(...evidence) {
  return deepFreeze([...new Set(evidence.flatMap((row) => row.formulaIds))].sort());
}

function orthogonalityResidual(eX, eY, eZ) {
  return canonicalNumber(Math.max(
    Math.abs(dot(eX, eY)),
    Math.abs(dot(eY, eZ)),
    Math.abs(dot(eZ, eX)),
  ));
}

function stressTolerance(reference) {
  return canonicalNumber(
    NUMERICAL_PROFILE.stressAbsoluteToleranceMpa
      + NUMERICAL_PROFILE.stressRelativeTolerance * Math.max(1, Math.abs(reference)),
  );
}

function enumValue(value, enumeration, label) {
  if (!Object.values(enumeration).includes(value)) throw new TypeError(`${label} is invalid.`);
  return value;
}

function positive(value, label) {
  const number = finite(value, label);
  if (number <= 0) throw new TypeError(`${label} must be greater than zero.`);
  return number;
}

function nonNegative(value, label) {
  const number = finite(value, label);
  if (number < 0) throw new TypeError(`${label} must be zero or greater.`);
  return number;
}
