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
    label: value.label,
    description: value.description,
    targetId: value.targetId,
    datasetId: value.datasetId,
    solverId: value.solverId,
    solverVersion: value.solverVersion,
    methodId: value.methodId,
    methodVersion: value.methodVersion,
    engineeringLevel: value.engineeringLevel,
    codeBasis: canonicalStrings(value.codeBasis),
    applicable: value.applicable,
    applicabilityReason: value.applicabilityReason,
    qualificationStatus: value.qualificationStatus,
    requiredInputs: canonicalEvidence(value.requiredInputs),
    resolvedInputs: canonicalEvidence(value.resolvedInputs),
    missingInputs: canonicalEvidence(value.missingInputs),
    invalidInputs: canonicalEvidence(value.invalidInputs),
    assumptions: canonicalStrings(value.assumptions),
    limitations: canonicalStrings(value.limitations),
    diagnostics: canonicalEvidence(value.diagnostics),
    readyToReview: value.readyToReview,
    readyToRun: value.readyToRun,
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
