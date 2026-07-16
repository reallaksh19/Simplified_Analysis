import { deepFreeze, normalizeDiagnosticRows, semanticHash, validateSharedPipingModel } from '../shared-piping-model/index.js';
import { validatePipingPortTopologyGraph, validateTopologyConnectionAudit } from '../piping-topology/index.js';
import {
  validateRestraintCapabilityAudit, validateRestraintCapabilityModel,
  validateSupportAttachmentAudit, validateSupportAttachmentModel,
} from '../support-restraints/index.js';
import { validateLoadCaseSet, validateModelLoadPrimitiveSet, validateModelLoadReadinessAudit } from '../model-loads/index.js';
import {
  validateSupportLoadScreeningAudit, validateTributarySupportLoadScreening, validateVerticalLoadPathModel,
} from '../support-load-screening/index.js';
import {
  validateFlexuralPropertyProjection, validateVerticalBeamModel, validateVerticalBeamSolution, validateVerticalBeamSolverAudit,
} from '../vertical-beam-solver/index.js';
import { validateModelCalculationLedger, validateModelCalculationPackage, validateModelCalculationReport } from '../model-calculation-package/index.js';
import { CONTEXT_SCHEMA, CONTRACT_KEYS } from './constants.js';

const VALIDATORS = Object.freeze({
  sharedModel: validateSharedPipingModel,
  topologyGraph: validatePipingPortTopologyGraph,
  topologyAudit: validateTopologyConnectionAudit,
  supportAttachmentModel: validateSupportAttachmentModel,
  supportAttachmentAudit: validateSupportAttachmentAudit,
  restraintCapabilityModel: validateRestraintCapabilityModel,
  restraintCapabilityAudit: validateRestraintCapabilityAudit,
  loadCaseSet: validateLoadCaseSet,
  loadPrimitiveSet: validateModelLoadPrimitiveSet,
  modelLoadReadinessAudit: validateModelLoadReadinessAudit,
  verticalLoadPathModel: validateVerticalLoadPathModel,
  supportLoadScreening: validateTributarySupportLoadScreening,
  supportLoadScreeningAudit: validateSupportLoadScreeningAudit,
  flexuralPropertyProjection: validateFlexuralPropertyProjection,
  verticalBeamModel: validateVerticalBeamModel,
  verticalBeamSolution: validateVerticalBeamSolution,
  verticalBeamSolverAudit: validateVerticalBeamSolverAudit,
  modelCalculationLedger: validateModelCalculationLedger,
  activeModelCalculationPackage: validateModelCalculationPackage,
  activeModelCalculationReport: validateModelCalculationReport,
});

export function createWorkspaceConsumerContext(input = {}) {
  const datasetId = nullableString(input.datasetId);
  const diagnostics = [];
  const contracts = Object.fromEntries(CONTRACT_KEYS.map((key) => [key, validateSlot(key, input.contracts?.[key], datasetId, diagnostics)]));
  enforceArchiveLinks(contracts, diagnostics);
  const contractReferences = CONTRACT_KEYS.map((key) => reference(key, contracts[key])).sort(compareKey);
  const availabilitySummary = summarize(contractReferences);
  const normalizedDiagnostics = normalizeDiagnosticRows(diagnostics);
  const identity = {
    schema: CONTEXT_SCHEMA, datasetId,
    workspaceVersion: Number.isInteger(input.workspaceVersion) ? input.workspaceVersion : 0,
    selectedEntityId: nullableString(input.selectedEntityId), contractReferences,
    availabilitySummary, diagnostics: normalizedDiagnostics,
  };
  const contextId = `workspace-consumer-context:${semanticHash(identity).split(':')[1]}`;
  const base = { ...identity, contextId, contracts };
  return deepFreeze({ ...base, semanticHash: semanticHash({ ...identity, contextId }) });
}

export function validateWorkspaceConsumerContext(value) {
  const errors = [];
  if (value?.schema !== CONTEXT_SCHEMA) errors.push('schema');
  if (!value?.contextId || !value?.semanticHash) errors.push('identity');
  CONTRACT_KEYS.forEach((key) => { if (!(key in (value?.contracts || {}))) errors.push(key); });
  return deepFreeze({ ok: errors.length === 0, errors: [...new Set(errors)].sort() });
}

function validateSlot(key, value, datasetId, diagnostics) {
  if (value == null) return null;
  const validation = VALIDATORS[key]?.(value);
  if (validation && validation.ok === false) return reject(key, 'INVALID_CONTRACT', diagnostics);
  if (!value.schema || !value.semanticHash) return reject(key, 'INVALID_CONTRACT', diagnostics);
  const contractDatasetId = findDatasetId(value);
  if (datasetId && contractDatasetId && datasetId !== contractDatasetId) return reject(key, 'DATASET_MISMATCH', diagnostics);
  return value;
}
function enforceArchiveLinks(contracts, diagnostics) {
  const ledger = contracts.modelCalculationLedger;
  const packageValue = contracts.activeModelCalculationPackage;
  const report = contracts.activeModelCalculationReport;
  if (packageValue && ledger && !ledger.entries?.some((entry) => entry.packageId === packageValue.packageId)) contracts.activeModelCalculationPackage = reject('activeModelCalculationPackage', 'STALE_ARCHIVE_PACKAGE', diagnostics);
  if (report && (!contracts.activeModelCalculationPackage || report.packageId !== contracts.activeModelCalculationPackage.packageId)) contracts.activeModelCalculationReport = reject('activeModelCalculationReport', 'STALE_ARCHIVE_REPORT', diagnostics);
}
function reference(contractKey, value) {
  return { contractKey, schema: value?.schema ?? null, semanticHash: value?.semanticHash ?? null, datasetId: findDatasetId(value), availability: value ? 'AVAILABLE' : 'UNAVAILABLE', qualificationSummary: value?.qualificationSummary ?? null };
}
function summarize(references) {
  const availableContractKeys = references.filter((row) => row.availability === 'AVAILABLE').map((row) => row.contractKey);
  return { availableContractCount: availableContractKeys.length, unavailableContractCount: references.length - availableContractKeys.length, availableContractKeys };
}
function reject(contractKey, code, diagnostics) {
  diagnostics.push({ code, severity: 'ERROR', scope: contractKey, message: `${contractKey} was excluded from the consumer context.` });
  return null;
}
function findDatasetId(value) { return value?.datasetId ?? value?.package?.datasetId ?? null; }
function nullableString(value) { return typeof value === 'string' && value ? value : null; }
function compareKey(a, b) { return a.contractKey.localeCompare(b.contractKey); }