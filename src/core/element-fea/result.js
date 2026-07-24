import { deepFreeze, semanticHash } from '../shared-piping-model/index.js';
import { CONTINUUM_RESULT_SCHEMA, RESULT_STATUS } from './constants.js';

export function rejectedResult(input, status, diagnostics, limitations = []) {
  const base = {
    schema: CONTINUUM_RESULT_SCHEMA,
    status,
    qualifiedResults: null,
    modelIdentity: String(input?.modelIdentity || ''),
    modelVersion: String(input?.modelVersion || ''),
    sourceSemanticHash: String(input?.sourceSemanticHash || ''),
    diagnostics,
    limitations,
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
    solverProfile: model.solverProfile,
    backendTrace: evidence.backendTrace,
    runtimeTrace: { runtimeIdentity: model.solverProfile.runtimeIdentity },
    loadCaseIdentity: loadCase.loadCaseId,
    dofMap: evidence.dofMap,
    constraintPartition: evidence.constraintPartition,
    directNodalLoads: evidence.directNodalLoads,
    equivalentEdgeLoads: evidence.equivalentEdgeLoads,
    edgeLoadEvidence: evidence.edgeLoadEvidence,
    effectiveFreeLoad: evidence.effectiveFreeLoad,
    nodalDisplacements: evidence.nodalDisplacements,
    reactions: evidence.reactions,
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
    strainEnergy: evidence.strainEnergy,
    diagnostics: evidence.diagnostics,
    limitations: [...model.limitations, ...model.solverProfile.limitations],
  };
  return deepFreeze({ ...base, semanticHash: semanticHash(base) });
}
