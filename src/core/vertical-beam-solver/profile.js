import { deepFreeze, semanticHash, stringValue } from '../shared-piping-model/index.js';
import {
  ELIGIBLE_LOAD_TYPES, FLEXURAL_BASIS, PROFILE_ID, PROFILE_VERSION,
  VERTICAL_BEAM_SOLVER_PROFILE_SCHEMA,
} from './constants.js';

export function createEulerBernoulliVerticalPathProfile(options = {}) {
  const base = {
    schema: VERTICAL_BEAM_SOLVER_PROFILE_SCHEMA,
    profileId: PROFILE_ID,
    profileVersion: PROFILE_VERSION,
    kinematicModel: 'EULER_BERNOULLI',
    signConvention: {
      verticalDisplacementPositive: 'GRAVITY_DOWN',
      appliedVerticalForcePositive: 'GRAVITY_DOWN',
      rotationPositive: 'LOCAL_DV_DX',
      signedSupportForcePositive: 'GRAVITY_DOWN',
    },
    pathEligibility: { requiredQualification: 'READY', topology: 'ACYCLIC_NON_BRANCHING_PATH' },
    supportBoundaryPolicy: {
      eligibleVerticalState: 'RESTRAINED', verticalDisplacementM: 0,
      rotation: 'FREE', penaltyStiffness: false, settlement: 'UNSUPPORTED',
      gaps: 'BLOCKED', springs: 'BLOCKED', minimumDistinctSupportCount: 2,
    },
    flexuralPropertyPrecedence: [FLEXURAL_BASIS.DIRECT_EI, FLEXURAL_BASIS.EXPLICIT_E_I, FLEXURAL_BASIS.CIRCULAR_E_I],
    loadEligibility: { primitiveTypes: ELIGIBLE_LOAD_TYPES, semanticDirection: 'GRAVITY_DOWN', globalVector: null },
    pointMomentPolicy: 'BLOCKED_NO_CERTIFIED_BENDING_AXIS',
    meshPolicy: 'EVIDENCE_BOUNDARY_STATIONS_ONLY',
    numericalSolverPolicy: {
      assemblyFormulaId: 'VERTICAL_BEAM_GLOBAL_ASSEMBLY_V1',
      solverFormulaId: 'SCALED_PARTIAL_PIVOT_LINEAR_SOLVE_V1',
      constraintMethod: 'FREE_CONSTRAINED_DOF_PARTITION',
      pivotAbsoluteTolerance: numberOption(options.pivotAbsoluteTolerance, 1e-14),
      pivotRelativeTolerance: numberOption(options.pivotRelativeTolerance, 1e-12),
    },
    geometryTolerancePolicy: tolerance(options.geometryTolerancePolicy, 1e-9, 1e-9, 'm'),
    forceEquilibriumTolerancePolicy: tolerance(options.forceEquilibriumTolerancePolicy, 1e-7, 1e-10, 'N'),
    momentEquilibriumTolerancePolicy: tolerance(options.momentEquilibriumTolerancePolicy, 1e-7, 1e-10, 'N*m'),
    matrixResidualTolerancePolicy: tolerance(options.matrixResidualTolerancePolicy, 1e-8, 1e-10, 'N'),
    supportDisplacementTolerancePolicy: tolerance(options.supportDisplacementTolerancePolicy, 1e-12, 1e-10, 'm'),
  };
  return deepFreeze({ ...base, semanticHash: semanticHash(base) });
}

export function validateVerticalBeamSolverProfile(profile) {
  const errors = [];
  if (profile?.schema !== VERTICAL_BEAM_SOLVER_PROFILE_SCHEMA) errors.push('Invalid vertical-beam solver profile schema.');
  if (profile?.profileId !== PROFILE_ID) errors.push('Unsupported vertical-beam solver profile ID.');
  if (!stringValue(profile?.profileVersion)) errors.push('Vertical-beam solver profile version is required.');
  if (profile?.kinematicModel !== 'EULER_BERNOULLI') errors.push('Vertical-beam kinematic model must be Euler-Bernoulli.');
  validateTolerance(profile?.forceEquilibriumTolerancePolicy, 'force', errors);
  validateTolerance(profile?.momentEquilibriumTolerancePolicy, 'moment', errors);
  validateTolerance(profile?.matrixResidualTolerancePolicy, 'matrix', errors);
  validateTolerance(profile?.supportDisplacementTolerancePolicy, 'displacement', errors);
  if (profile?.semanticHash !== semanticHash(withoutHash(profile))) errors.push('Vertical-beam solver profile semantic hash mismatch.');
  return deepFreeze({ ok: errors.length === 0, errors });
}

function tolerance(value, absoluteDefault, relativeDefault, unit) {
  return deepFreeze({
    absoluteTolerance: numberOption(value?.absoluteTolerance, absoluteDefault),
    relativeTolerance: numberOption(value?.relativeTolerance, relativeDefault), unit,
  });
}
function numberOption(value, fallback) { return Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : fallback; }
function validateTolerance(value, label, errors) {
  if (!Number.isFinite(value?.absoluteTolerance) || value.absoluteTolerance < 0) errors.push(`Invalid ${label} absolute tolerance.`);
  if (!Number.isFinite(value?.relativeTolerance) || value.relativeTolerance < 0) errors.push(`Invalid ${label} relative tolerance.`);
}
function withoutHash(value) { const { semanticHash: _semanticHash, ...rest } = value || {}; return rest; }
