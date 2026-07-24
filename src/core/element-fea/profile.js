import { deepFreeze, finiteNumber, stringValue } from '../shared-piping-model/index.js';
import {
  BACKEND_ID,
  DOF_ORDER,
  FORMULATIONS,
  LFEA_PROFILE_SCHEMA,
  STRAIN_ORDER,
  STRESS_ORDER,
} from './constants.js';

export function createLfeaProfile(input) {
  const source = input && typeof input === 'object' ? input : {};
  const formulation = source.formulation;
  if (!Object.values(FORMULATIONS).includes(formulation)) throw new TypeError('LFEA formulation is invalid.');
  const profile = {
    schema: LFEA_PROFILE_SCHEMA,
    profileIdentity: requiredText(source.profileIdentity, 'profileIdentity'),
    profileVersion: requiredText(source.profileVersion, 'profileVersion'),
    formulation,
    units: requiredRecord(source.units, 'units'),
    coordinateConvention: requiredText(source.coordinateConvention, 'coordinateConvention'),
    dofOrder: [...DOF_ORDER],
    stressVectorOrder: [...STRESS_ORDER],
    strainVectorOrder: [...STRAIN_ORDER],
    shearConvention: 'ENGINEERING_GAMMA_XY',
    elementNodeOrder: 'COUNTERCLOCKWISE_POSITIVE_SIGNED_AREA',
    signedAreaPolicy: 'REJECT_ZERO_OR_NONPOSITIVE',
    constraintMethod: 'PARTITION_ELIMINATION',
    reactionConvention: 'SUPPORT_FORCE_ON_STRUCTURE',
    principalStressConvention: 'IN_PLANE_ATAN2_HALF_ANGLE_AND_FULL_3D_SET_FOR_PLANE_STRAIN',
    vonMisesConvention: formulation === FORMULATIONS.PLANE_STRAIN
      ? 'THREE_DIMENSIONAL_WITH_RECOVERED_SIGMA_Z'
      : 'PLANE_STRESS_SIGMA_Z_ZERO',
    residualDefinitions: 'ORIGINAL_ASSEMBLED_SYSTEM',
    energyDefinition: 'HALF_U_TRANSPOSE_K_U',
    identityComparator: 'UNICODE_CODE_POINT_ASCENDING',
    floatingPointEvidencePolicy: 'RAW_FINITE_IEEE754_CANONICAL_JSON_V1',
    backendIdentity: BACKEND_ID,
    runtimeIdentity: requiredText(source.runtimeIdentity, 'runtimeIdentity'),
    outOfPlaneScale: positive(source.outOfPlaneScale, 'outOfPlaneScale'),
    tolerances: tolerances(source.tolerances),
    referenceBackendMaxDofs: positiveInteger(source.referenceBackendMaxDofs, 'referenceBackendMaxDofs'),
    limitations: textArray(source.limitations, 'limitations'),
  };
  return deepFreeze(profile);
}

export function validateLfeaProfile(value) {
  try { return deepFreeze({ ok: true, profile: createLfeaProfile(value), errors: [] }); }
  catch (error) { return deepFreeze({ ok: false, profile: null, errors: [error.message] }); }
}

function tolerances(value) {
  const row = requiredRecord(value, 'tolerances');
  return {
    geometryArea: positive(row.geometryArea, 'tolerances.geometryArea'),
    pivotAbsolute: positive(row.pivotAbsolute, 'tolerances.pivotAbsolute'),
    pivotRatio: positive(row.pivotRatio, 'tolerances.pivotRatio'),
    residualForceAbsolute: positive(row.residualForceAbsolute, 'tolerances.residualForceAbsolute'),
    residualForceRelative: positive(row.residualForceRelative, 'tolerances.residualForceRelative'),
    forceEquilibriumAbsolute: positive(row.forceEquilibriumAbsolute, 'tolerances.forceEquilibriumAbsolute'),
    momentEquilibriumAbsolute: positive(row.momentEquilibriumAbsolute, 'tolerances.momentEquilibriumAbsolute'),
  };
}
function requiredText(value, name) { const text = stringValue(value); if (!text) throw new TypeError(`${name} is required.`); return text; }
function requiredRecord(value, name) { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} is required.`); return value; }
function positive(value, name) { const number = finiteNumber(value); if (!(number > 0)) throw new TypeError(`${name} must be positive.`); return number; }
function positiveInteger(value, name) { const number = positive(value, name); if (!Number.isInteger(number)) throw new TypeError(`${name} must be an integer.`); return number; }
function textArray(value, name) { if (!Array.isArray(value) || value.some((item) => !stringValue(item))) throw new TypeError(`${name} must contain text.`); return value.map(stringValue).sort(compare); }
function compare(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
