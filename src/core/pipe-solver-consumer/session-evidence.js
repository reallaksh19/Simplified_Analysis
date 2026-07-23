import { canonicalStringify, deepFreeze } from '../shared-piping-model/index.js';

export function projectSessionReadiness(value) {
  return deepFreeze({
    enabled: value?.enabled === true,
    missing: canonicalStrings(value?.missing),
  });
}

export function projectWorkspaceReadiness(value) {
  if (!value) return null;
  return deepFreeze({
    schema: value.schema,
    analysisType: value.analysisType,
    targetId: value.targetId,
    datasetId: value.datasetId,
    solverId: value.solverId,
    solverVersion: value.solverVersion,
    methodId: value.methodId,
    methodVersion: value.methodVersion,
    engineeringLevel: value.engineeringLevel,
    applicable: value.applicable,
    qualificationStatus: value.qualificationStatus,
    readyToReview: value.readyToReview,
    readyToRun: value.readyToRun,
    missingInputs: canonicalEvidence(value.missingInputs),
    invalidInputs: canonicalEvidence(value.invalidInputs),
    diagnostics: canonicalEvidence(value.diagnostics),
    assumptions: value.assumptions,
    limitations: value.limitations,
  });
}

function canonicalStrings(values) {
  return deepFreeze([...(values || [])].map(String).sort());
}

function canonicalEvidence(rows) {
  return deepFreeze([...(rows || [])].sort((left, right) => {
    return canonicalStringify(left).localeCompare(canonicalStringify(right));
  }));
}
