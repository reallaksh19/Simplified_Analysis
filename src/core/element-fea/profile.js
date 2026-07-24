import { deepFreeze } from '../shared-piping-model/immutable.js';
import {
  BACKEND_ID,
  DOF_ORDER,
  FORMULATIONS,
  LFEA_PROFILE_SCHEMA,
  PRESSURE_CONVENTION,
  REACTION_CONVENTION,
  STRAIN_ORDER,
  STRESS_ORDER,
} from './constants.js';

export function createLfeaProfile(input) {
  const source = requiredRecord(input, 'profile');
  exactKeys(source, ['schema','profileIdentity','profileVersion','formulation','units','coordinateConvention','dofOrder','stressVectorOrder','strainVectorOrder','shearConvention','elementNodeOrder','signedAreaPolicy','constraintMethod','reactionConvention','pressureConvention','principalStressConvention','vonMisesConvention','residualDefinitions','energyDefinition','identityComparator','floatingPointEvidencePolicy','backendIdentity','runtimeIdentity','outOfPlaneScale','tolerances','referenceBackendMaxDofs','limitations'], 'profile');
  if (source.schema !== LFEA_PROFILE_SCHEMA) throw new TypeError('Invalid lfea-profile/v1 schema.');
  const formulation = source.formulation;
  if (!Object.values(FORMULATIONS).includes(formulation)) throw new TypeError('LFEA formulation is invalid.');
  const profile = {
    schema: LFEA_PROFILE_SCHEMA,
    profileIdentity: requiredText(source.profileIdentity, 'profileIdentity'),
    profileVersion: requiredText(source.profileVersion, 'profileVersion'),
    formulation,
    units: normalizeUnits(source.units),
    coordinateConvention: exactText(source.coordinateConvention, 'coordinateConvention'),
    dofOrder: exactArray(source.dofOrder, DOF_ORDER, 'dofOrder'),
    stressVectorOrder: exactArray(source.stressVectorOrder, STRESS_ORDER, 'stressVectorOrder'),
    strainVectorOrder: exactArray(source.strainVectorOrder, STRAIN_ORDER, 'strainVectorOrder'),
    shearConvention: exact(source.shearConvention, 'ENGINEERING_GAMMA_XY', 'shearConvention'),
    elementNodeOrder: exact(source.elementNodeOrder, 'COUNTERCLOCKWISE_POSITIVE_SIGNED_AREA', 'elementNodeOrder'),
    signedAreaPolicy: exact(source.signedAreaPolicy, 'REJECT_ZERO_NEAR_ZERO_OR_NONPOSITIVE', 'signedAreaPolicy'),
    constraintMethod: exact(source.constraintMethod, 'PARTITION_ELIMINATION', 'constraintMethod'),
    reactionConvention: exact(source.reactionConvention, REACTION_CONVENTION, 'reactionConvention'),
    pressureConvention: exact(source.pressureConvention, PRESSURE_CONVENTION, 'pressureConvention'),
    principalStressConvention: exact(source.principalStressConvention, 'IN_PLANE_ATAN2_HALF_ANGLE_AND_FULL_3D_SET_FOR_PLANE_STRAIN', 'principalStressConvention'),
    vonMisesConvention: exactVonMises(source.vonMisesConvention, formulation),
    residualDefinitions: exact(source.residualDefinitions, 'ORIGINAL_ASSEMBLED_SYSTEM', 'residualDefinitions'),
    energyDefinition: exact(source.energyDefinition, 'HALF_U_TRANSPOSE_K_U', 'energyDefinition'),
    identityComparator: exact(source.identityComparator, 'UNICODE_CODE_POINT_ASCENDING', 'identityComparator'),
    floatingPointEvidencePolicy: exact(source.floatingPointEvidencePolicy, 'RAW_FINITE_IEEE754_CANONICAL_JSON_V1', 'floatingPointEvidencePolicy'),
    backendIdentity: exact(source.backendIdentity, BACKEND_ID, 'backendIdentity'),
    runtimeIdentity: requiredText(source.runtimeIdentity, 'runtimeIdentity'),
    outOfPlaneScale: positive(source.outOfPlaneScale, 'outOfPlaneScale'),
    tolerances: normalizeTolerances(source.tolerances),
    referenceBackendMaxDofs: positiveInteger(source.referenceBackendMaxDofs, 'referenceBackendMaxDofs'),
    limitations: textArray(source.limitations, 'limitations'),
  };
  return deepFreeze(profile);
}

export function validateLfeaProfile(value) {
  try { return deepFreeze({ ok: true, profile: createLfeaProfile(value), errors: [] }); }
  catch (error) { return deepFreeze({ ok: false, profile: null, errors: [error.message] }); }
}

function normalizeUnits(value) {
  const row = requiredRecord(value, 'units');
  exactKeys(row, ['length','force','stress'], 'units');
  return {
    length: requiredText(row.length, 'units.length'),
    force: requiredText(row.force, 'units.force'),
    stress: requiredText(row.stress, 'units.stress'),
  };
}
function normalizeTolerances(value) {
  const row = requiredRecord(value, 'tolerances');
  exactKeys(row, ['geometryArea','pivotAbsolute','pivotRatio','matrixSymmetryAbsolute','residualForceAbsolute','residualForceRelative','forceEquilibriumAbsolute','momentEquilibriumAbsolute','energyAbsolute'], 'tolerances');
  return {
    geometryArea: positive(row.geometryArea, 'tolerances.geometryArea'),
    pivotAbsolute: positive(row.pivotAbsolute, 'tolerances.pivotAbsolute'),
    pivotRatio: unitIntervalExclusive(row.pivotRatio, 'tolerances.pivotRatio'),
    matrixSymmetryAbsolute: positive(row.matrixSymmetryAbsolute, 'tolerances.matrixSymmetryAbsolute'),
    residualForceAbsolute: positive(row.residualForceAbsolute, 'tolerances.residualForceAbsolute'),
    residualForceRelative: positive(row.residualForceRelative, 'tolerances.residualForceRelative'),
    forceEquilibriumAbsolute: positive(row.forceEquilibriumAbsolute, 'tolerances.forceEquilibriumAbsolute'),
    momentEquilibriumAbsolute: positive(row.momentEquilibriumAbsolute, 'tolerances.momentEquilibriumAbsolute'),
    energyAbsolute: positive(row.energyAbsolute, 'tolerances.energyAbsolute'),
  };
}
function exactVonMises(value, formulation) {
  const expected = formulation === FORMULATIONS.PLANE_STRAIN
    ? 'THREE_DIMENSIONAL_WITH_RECOVERED_SIGMA_Z' : 'PLANE_STRESS_SIGMA_Z_ZERO';
  return exact(value, expected, 'vonMisesConvention');
}
function exactArray(value, expected, name) {
  if (!Array.isArray(value) || value.length !== expected.length || value.some((item, index) => item !== expected[index])) {
    throw new TypeError(`${name} must exactly match the approved order.`);
  }
  return [...expected];
}
function exact(value, expected, name) { if (value !== expected) throw new TypeError(`${name} must equal ${expected}.`); return expected; }
function exactText(value, name) { return requiredText(value, name); }
function requiredText(value, name) { if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} is required.`); return value.trim(); }
function requiredRecord(value, name) { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} is required.`); return value; }
function finite(value, name) { if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${name} must be finite.`); return value; }
function positive(value, name) { const number = finite(value, name); if (!(number > 0)) throw new TypeError(`${name} must be positive.`); return number; }
function positiveInteger(value, name) { const number = positive(value, name); if (!Number.isInteger(number)) throw new TypeError(`${name} must be an integer.`); return number; }
function unitIntervalExclusive(value, name) { const number = positive(value, name); if (!(number < 1)) throw new TypeError(`${name} must be less than one.`); return number; }
function textArray(value, name) { if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim())) throw new TypeError(`${name} must contain text.`); return value.map((item) => item.trim()).sort(compare); }
function exactKeys(value, allowed, name) { const extras = Object.keys(value).filter((key) => !allowed.includes(key)); if (extras.length) throw new TypeError(`${name} contains unsupported fields: ${extras.sort(compare).join(', ')}.`); }
function compare(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
