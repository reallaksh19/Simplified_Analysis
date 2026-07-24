import { deepFreeze } from '../shared-piping-model/immutable.js';
import { semanticHash } from '../shared-piping-model/canonical-json.js';
import { CONTINUUM_MODEL_SCHEMA, CONTINUUM_RESULT_SCHEMA, RESULT_STATUS } from './constants.js';

export function rejectedResult(input, status, diagnostics, limitations = [], trace = {}) {
  const modelEvidence = normalizedModelEvidence(input);
  const base = {
    schema: CONTINUUM_RESULT_SCHEMA,
    status,
    qualifiedResults: null,
    modelIdentity: textOrEmpty(input?.modelIdentity),
    modelVersion: textOrEmpty(input?.modelVersion),
    sourceSemanticHash: textOrEmpty(input?.sourceSemanticHash),
    modelSemanticHash: modelEvidence?.semanticHash || null,
    modelEvidence,
    diagnostics: normalizedDiagnostics(diagnostics),
    limitations: normalizedText(limitations),
    ...trace,
  };
  return deepFreeze({ ...base, semanticHash: semanticHash(base) });
}

export function qualifiedResult(model, loadCase, evidence) {
  const base = {
    schema: CONTINUUM_RESULT_SCHEMA,
    status: RESULT_STATUS.QUALIFIED,
    qualifiedResults: 'complete',
    modelIdentity: model.modelIdentity,
    modelVersion: model.modelVersion,
    sourceSemanticHash: model.sourceSemanticHash,
    modelSemanticHash: model.semanticHash,
    modelEvidence: model,
    solverProfile: model.solverProfile,
    runtimeTrace: { runtimeIdentity: model.solverProfile.runtimeIdentity },
    loadCaseIdentity: loadCase.loadCaseId,
    ...systemEvidence(evidence),
    ...recoveryEvidence(model, evidence),
  };
  return deepFreeze({ ...base, semanticHash: semanticHash(base) });
}

export function validateContinuumResult(value) {
  const errors = [];
  if (value?.schema !== CONTINUUM_RESULT_SCHEMA) errors.push('Invalid fea-continuum-result/v1 schema.');
  if (!Object.values(RESULT_STATUS).includes(value?.status)) errors.push('LFEA result status is invalid.');
  if (!Array.isArray(value?.diagnostics) || !Array.isArray(value?.limitations)) errors.push('LFEA result diagnostics or limitations are invalid.');
  validateModelEvidence(value, errors);
  if (value?.status === RESULT_STATUS.QUALIFIED) validateQualifiedEvidence(value, errors);
  else validateRejectedEvidence(value, errors);
  try {
    if (value?.semanticHash !== semanticHash(withoutHash(value))) errors.push('LFEA result semantic hash mismatch.');
  } catch (error) { errors.push(error.message); }
  return deepFreeze({ ok: errors.length === 0, errors });
}

function systemEvidence(evidence) {
  return {
    assembledSystemHash: evidence.assembledSystemHash,
    backendTrace: evidence.backendTrace,
    dofMap: evidence.dofMap,
    constraintPartition: evidence.constraintPartition,
    directNodalLoads: evidence.directNodalLoads,
    directNodalLoadEvidence: evidence.directNodalLoadEvidence,
    equivalentEdgeLoads: evidence.equivalentEdgeLoads,
    edgeLoadEvidence: evidence.edgeLoadEvidence,
    appliedLoadVector: evidence.appliedLoadVector,
    effectiveFreeLoad: evidence.effectiveFreeLoad,
  };
}
function recoveryEvidence(model, evidence) {
  return {
    nodalDisplacements: evidence.nodalDisplacements,
    reactions: evidence.reactions,
    constrainedDofImbalance: evidence.constrainedDofImbalance,
    elementStrains: evidence.elementStrains,
    elementStresses: evidence.elementStresses,
    principalStresses: evidence.principalStresses,
    vonMisesStress: evidence.vonMisesStress,
    elementInternalForces: evidence.elementInternalForces,
    elementStrainEnergy: evidence.elementStrainEnergy,
    freeDofResidual: evidence.freeDofResidual,
    globalResidual: evidence.globalResidual,
    appliedLoadTotals: evidence.appliedLoadTotals,
    reactionTotals: evidence.reactionTotals,
    equilibriumTotals: evidence.equilibriumTotals,
    strainEnergy: evidence.strainEnergy,
    energyConsistency: evidence.energyConsistency,
    diagnostics: evidence.diagnostics,
    limitations: normalizedText([...model.limitations, ...model.solverProfile.limitations]),
  };
}
function validateModelEvidence(value, errors) {
  if (value?.modelEvidence === null) {
    if (value?.modelSemanticHash !== null) errors.push('LFEA result model identity is inconsistent.');
    return;
  }
  if (value?.modelEvidence?.schema !== CONTINUUM_MODEL_SCHEMA) errors.push('LFEA result model evidence is invalid.');
  if (value?.modelSemanticHash !== value?.modelEvidence?.semanticHash) errors.push('LFEA result model semantic hash mismatch.');
}
function validateQualifiedEvidence(value, errors) {
  if (value?.qualifiedResults !== 'complete') errors.push('Qualified LFEA result is incomplete.');
  if (!value?.modelEvidence || !value?.modelSemanticHash) errors.push('Qualified LFEA result is missing model evidence.');
  const arrays = [
    'dofMap', 'directNodalLoads', 'equivalentEdgeLoads', 'appliedLoadVector', 'effectiveFreeLoad',
    'nodalDisplacements', 'reactions', 'constrainedDofImbalance', 'elementStrains', 'elementStresses',
    'principalStresses', 'vonMisesStress', 'elementInternalForces', 'elementStrainEnergy',
  ];
  arrays.forEach((field) => { if (!Array.isArray(value?.[field])) errors.push(`Qualified LFEA result ${field} is invalid.`); });
  if (!value?.backendTrace || !value?.constraintPartition || !value?.freeDofResidual || !value?.globalResidual) errors.push('Qualified LFEA result is missing system evidence.');
}
function validateRejectedEvidence(value, errors) {
  if (value?.qualifiedResults !== null) errors.push('Rejected LFEA result cannot contain qualified results.');
  ['nodalDisplacements', 'reactions', 'elementStrains', 'elementStresses', 'strainEnergy'].forEach((field) => {
    if (Object.hasOwn(value || {}, field)) errors.push(`Rejected LFEA result contains partial ${field} evidence.`);
  });
}
function normalizedModelEvidence(value) {
  return value?.schema === CONTINUUM_MODEL_SCHEMA && typeof value?.semanticHash === 'string' ? value : null;
}
function normalizedDiagnostics(value) {
  if (!Array.isArray(value)) return [];
  return [...value].map((row) => ({ code: textOrEmpty(row?.code), severity: textOrEmpty(row?.severity), message: textOrEmpty(row?.message) }))
    .sort((left, right) => compare(left.code, right.code) || compare(left.message, right.message));
}
function normalizedText(value) { return [...new Set((Array.isArray(value) ? value : []).filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean))].sort(compare); }
function textOrEmpty(value) { return typeof value === 'string' ? value : ''; }
function withoutHash(value) { const { semanticHash: _hash, ...base } = value || {}; return base; }
function compare(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
