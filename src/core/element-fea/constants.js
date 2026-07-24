export const LFEA_PROFILE_SCHEMA = 'lfea-profile/v1';
export const CONTINUUM_MODEL_SCHEMA = 'fea-continuum-model/v1';
export const CONTINUUM_RESULT_SCHEMA = 'fea-continuum-result/v1';
export const ELEMENT_TYPE = 'T3';
export const DOF_ORDER = Object.freeze(['UX', 'UY']);
export const STRAIN_ORDER = Object.freeze(['EX', 'EY', 'GXY']);
export const STRESS_ORDER = Object.freeze(['SX', 'SY', 'TXY']);
export const FORMULATIONS = Object.freeze({
  PLANE_STRESS: 'PLANE_STRESS',
  PLANE_STRAIN: 'PLANE_STRAIN',
});
export const LOAD_TYPES = Object.freeze({
  TRACTION: 'TRACTION',
  PRESSURE: 'PRESSURE',
});
export const RESULT_STATUS = Object.freeze({
  QUALIFIED: 'QUALIFIED',
  REJECTED_INVALID: 'REJECTED_INVALID',
  REJECTED_SINGULAR: 'REJECTED_SINGULAR',
  QUARANTINED_NUMERICAL: 'QUARANTINED_NUMERICAL',
});
export const BACKEND_ID = 'dense-ldlt-reference/v1';
