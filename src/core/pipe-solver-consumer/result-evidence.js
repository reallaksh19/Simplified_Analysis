import { deepFreeze, semanticHash } from '../shared-piping-model/index.js';
import { validateSolverResultContract } from '../solvers/certification/solverResultContract.js';
import {
  PIPE_SCREENING_ENGINEERING_LEVEL,
  PIPE_SCREENING_RESULT_METHOD_BY_GEOMETRY,
  PIPE_SCREENING_RESULT_METHOD_IDS,
  PIPE_SCREENING_RESULT_MODULE_ID,
  PIPE_SCREENING_RESULT_SCHEMA,
} from './constants.js';

export function validatePipeScreeningResult(result) {
  const validation = validateSolverResultContract(result);
  const errors = [...validation.errors];
  if (result?.schemaVersion !== PIPE_SCREENING_RESULT_SCHEMA) errors.push('Unexpected Pipe Solver result schema.');
  if (result?.moduleId !== PIPE_SCREENING_RESULT_MODULE_ID) errors.push('Unexpected Pipe Solver result module.');
  if (result?.engineeringLevel !== PIPE_SCREENING_ENGINEERING_LEVEL) errors.push('Unexpected Pipe Solver engineering level.');
  validateMethodEvidence(result, errors);
  validateDeclaredHash(result, errors);
  return deepFreeze({ ok: errors.length === 0, errors });
}

function validateMethodEvidence(result, errors) {
  const methodId = result?.methodId;
  const geometryType = result?.meta?.geometryType;
  const expectedMethodId = PIPE_SCREENING_RESULT_METHOD_BY_GEOMETRY[geometryType];
  if (!PIPE_SCREENING_RESULT_METHOD_IDS.includes(methodId)) {
    errors.push('Unexpected Pipe Solver result method.');
  }
  if (!expectedMethodId) {
    errors.push('Unexpected Pipe Solver geometry type.');
  } else if (methodId !== expectedMethodId) {
    errors.push('Pipe Solver result method does not match meta.geometryType.');
  }
}

function validateDeclaredHash(result, errors) {
  if (!result || !Object.prototype.hasOwnProperty.call(result, 'semanticHash')) return;
  const { semanticHash: declared, ...payload } = result;
  if (declared !== semanticHash(payload)) errors.push('Pipe Solver result semantic hash mismatch.');
}
