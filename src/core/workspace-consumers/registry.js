import { canonicalStringify, deepFreeze, semanticHash, stringValue } from '../shared-piping-model/index.js';
import {
  CONSUMER_IDS,
  IMPLEMENTATION_STATUS,
  WORKSPACE_CONSUMER_REGISTRY_SCHEMA,
  WORKSPACE_CONSUMER_REGISTRY_V2_SCHEMA,
  WORKSPACE_CONSUMER_REGISTRY_V3_SCHEMA,
  WORKSPACE_CONSUMER_REGISTRY_V4_SCHEMA,
  WORKSPACE_CONSUMER_REGISTRY_V5_SCHEMA,
} from './constants.js';

export function createWorkspaceConsumerRegistry() { return canonicalRegistry(1); }
export function createWorkspaceConsumerRegistryV2() { return canonicalRegistry(2); }
export function createWorkspaceConsumerRegistryV3() { return canonicalRegistry(3); }
export function createWorkspaceConsumerRegistryV4() { return canonicalRegistry(4); }
export function createWorkspaceConsumerRegistryV5() { return canonicalRegistry(5); }

export function validateWorkspaceConsumerRegistry(value) {
  const supported = [1, 2, 3, 4, 5].map(canonicalRegistry);
  const valid = supported.some((row) => canonicalStringify(value) === canonicalStringify(row));
  return deepFreeze({ ok: valid, errors: valid ? [] : ['Workspace consumer registry does not match a closed supported registry version.'] });
}
export function validateWorkspaceConsumerRegistryV1(value) { return validateExact(value, canonicalRegistry(1), WORKSPACE_CONSUMER_REGISTRY_SCHEMA); }
export function validateWorkspaceConsumerRegistryV2(value) { return validateExact(value, canonicalRegistry(2), WORKSPACE_CONSUMER_REGISTRY_V2_SCHEMA); }
export function validateWorkspaceConsumerRegistryV3(value) { return validateExact(value, canonicalRegistry(3), WORKSPACE_CONSUMER_REGISTRY_V3_SCHEMA); }
export function validateWorkspaceConsumerRegistryV4(value) { return validateExact(value, canonicalRegistry(4), WORKSPACE_CONSUMER_REGISTRY_V4_SCHEMA); }
export function validateWorkspaceConsumerRegistryV5(value) { return validateExact(value, canonicalRegistry(5), WORKSPACE_CONSUMER_REGISTRY_V5_SCHEMA); }

export function workspaceConsumerDescriptor(registry, consumerId) {
  if (!validateWorkspaceConsumerRegistry(registry).ok) throw new TypeError('Workspace consumer registry is invalid.');
  const descriptor = registry.consumers.find((row) => row.consumerId === consumerId);
  if (!descriptor) throw new TypeError(`Unknown workspace consumer: ${consumerId}.`);
  return descriptor;
}

function validateExact(value, expected, schema) {
  const errors = [];
  if (value?.schema !== schema) errors.push(`Invalid ${schema} schema.`);
  if (canonicalStringify(value) !== canonicalStringify(expected)) errors.push(`${schema} does not match its closed canonical descriptor set.`);
  return deepFreeze({ ok: errors.length === 0, errors });
}

function canonicalRegistry(version) {
  const comparator = version === 5 ? compareIds : (a, b) => a.consumerId.localeCompare(b.consumerId);
  const consumers = descriptorRows(version).map(normalizeDescriptor).sort(comparator);
  const base = { schema: registrySchema(version), consumers };
  return deepFreeze({ ...base, semanticHash: semanticHash(base) });
}

function descriptorRows(version) {
  return [
    row(CONSUMER_IDS.WORKSPACE, 'Workspace', 'Current model review and explicit analysis actions.', IMPLEMENTATION_STATUS.IMPLEMENTED, [], allContracts(), workspaceActions(), 'EXISTING_CONTRACT_CLAIMS_ONLY'),
    row(CONSUMER_IDS.REPORTS, 'Reports', 'Review and export the active archived W10.7 package report.', IMPLEMENTATION_STATUS.IMPLEMENTED, reportsRequired(), reportsOptional(), reportsActions(), 'ARCHIVED_REPORT_EVIDENCE_ONLY'),
    loadCalcRow(version),
    threeDCalcRow(version),
    pipeSolverRow(version),
    ...(version >= 5 ? [elementFeaRow()] : []),
    row(CONSUMER_IDS.QA, 'QA', 'Future contract quality-assurance consumer.', IMPLEMENTATION_STATUS.NOT_IMPLEMENTED, ['sharedModel'], allContracts().filter((key) => key !== 'sharedModel'), [], 'NO_ENGINEERING_CLAIMS'),
    row(CONSUMER_IDS.DEBUG, 'Debug', 'Future read-only contract inspection consumer.', IMPLEMENTATION_STATUS.NOT_IMPLEMENTED, [], allContracts(), [], 'NO_ENGINEERING_CLAIMS'),
  ];
}

function loadCalcRow(version) {
  if (version === 1) return row(CONSUMER_IDS.LOAD_CALC, 'Load Calc', 'Future reusable load-calculation consumer.', IMPLEMENTATION_STATUS.NOT_IMPLEMENTED, ['loadCaseSet','loadPrimitiveSet','modelLoadReadinessAudit','sharedModel'], ['supportLoadScreening','verticalLoadPathModel'], [], 'NO_ENGINEERING_CLAIMS');
  return row(CONSUMER_IDS.LOAD_CALC, 'Load Calc', 'Review exact W10.4 model-load evidence and optional W10.5 tributary screening.', IMPLEMENTATION_STATUS.IMPLEMENTED, ['sharedModel','loadCaseSet','loadPrimitiveSet','modelLoadReadinessAudit'], ['verticalLoadPathModel','supportLoadScreening','supportLoadScreeningAudit'], ['REBUILD_MODEL_LOADS','EXPORT_MODEL_LOADS','REBUILD_VERTICAL_LOAD_PATHS','RUN_TRIBUTARY_SCREENING','EXPORT_TRIBUTARY_SCREENING'], 'MODEL_LOAD_EVIDENCE_AND_OPTIONAL_TRIBUTARY_SCREENING_ONLY');
}

function threeDCalcRow(version) {
  if (version < 3) return row(CONSUMER_IDS.THREE_D_CALC, '3D Calc', 'Future three-dimensional calculation consumer.', IMPLEMENTATION_STATUS.NOT_IMPLEMENTED, ['restraintCapabilityModel','sharedModel','supportAttachmentModel','topologyGraph'], ['loadPrimitiveSet','verticalBeamSolution'], [], 'NO_ENGINEERING_CLAIMS');
  return row(CONSUMER_IDS.THREE_D_CALC, '3D Calc', 'Review exact model, topology, support/restraint and optional vertical-beam evidence.', IMPLEMENTATION_STATUS.IMPLEMENTED,
    ['sharedModel','topologyGraph','topologyAudit','supportAttachmentModel','supportAttachmentAudit','restraintCapabilityModel','restraintCapabilityAudit'],
    ['loadPrimitiveSet','flexuralPropertyProjection','verticalBeamModel','verticalBeamSolution','verticalBeamSolverAudit'],
    ['EXPORT_SHARED_MODEL','REBUILD_TOPOLOGY_EXACT','EXPORT_TOPOLOGY','REBUILD_SUPPORT_EVIDENCE','EXPORT_SUPPORT_RESTRAINT','REBUILD_VERTICAL_BEAM_MODEL','SOLVE_VERTICAL_BEAM','EXPORT_VERTICAL_BEAM'],
    'MODEL_TOPOLOGY_RESTRAINT_AND_OPTIONAL_VERTICAL_BEAM_EVIDENCE_ONLY');
}

function pipeSolverRow(version) {
  if (version < 4) return row(CONSUMER_IDS.PIPE_SOLVER, 'Pipe Solver', 'Future piping solver consumer.', IMPLEMENTATION_STATUS.NOT_IMPLEMENTED, ['loadCaseSet','loadPrimitiveSet','restraintCapabilityModel','sharedModel','supportAttachmentModel','topologyGraph'], ['flexuralPropertyProjection','verticalBeamModel'], [], 'NO_ENGINEERING_CLAIMS');
  return row(CONSUMER_IDS.PIPE_SOLVER, 'Pipe Solver', 'Review and request the existing guarded pipe-screening capability.', IMPLEMENTATION_STATUS.IMPLEMENTED,
    ['sharedModel','topologyGraph','topologyAudit'],
    ['supportAttachmentModel','restraintCapabilityModel','loadCaseSet','loadPrimitiveSet','flexuralPropertyProjection','verticalBeamModel','verticalBeamSolution'],
    ['OPEN_PIPE_SCREENING_SESSION','UPDATE_PIPE_SCREENING_OVERRIDE','RESET_PIPE_SCREENING_SESSION','RUN_PIPE_SCREENING','CLOSE_PIPE_SCREENING_SESSION','SELECT_ANALYSIS_LEDGER_ENTRY','EXPORT_ANALYSIS_LEDGER'],
    'EXISTING_BENCHMARKED_SIMPLIFIED_2D_SCREENING_ONLY');
}

function elementFeaRow() {
  return row(CONSUMER_IDS.ELEMENT_FEA, 'Element FEA', 'Run an explicit independent T3 linear-elastic continuum model.', IMPLEMENTATION_STATUS.IMPLEMENTED,
    [], [], ['LOAD_EXPLICIT_EXAMPLE','RUN_ELEMENT_FEA','EXPORT_ELEMENT_FEA_RESULT','CLEAR_ELEMENT_FEA'],
    'LFEA_T3_LINEAR_2D_CONTINUUM_ONLY');
}

function registrySchema(version) {
  if (version === 5) return WORKSPACE_CONSUMER_REGISTRY_V5_SCHEMA;
  if (version === 4) return WORKSPACE_CONSUMER_REGISTRY_V4_SCHEMA;
  if (version === 3) return WORKSPACE_CONSUMER_REGISTRY_V3_SCHEMA;
  return version === 2 ? WORKSPACE_CONSUMER_REGISTRY_V2_SCHEMA : WORKSPACE_CONSUMER_REGISTRY_SCHEMA;
}
function row(consumerId, label, purpose, implementationStatus, required, optional, actions, policy) { return { consumerId, label, purpose, implementationStatus, requiredContractKeys: required, optionalContractKeys: optional, allowedActions: actions, engineeringClaimPolicy: policy }; }
function normalizeDescriptor(value) {
  if (!stringValue(value.purpose) || !stringValue(value.engineeringClaimPolicy)) throw new TypeError('Consumer descriptor text is required.');
  return deepFreeze({ ...value, requiredContractKeys: [...value.requiredContractKeys].sort(), optionalContractKeys: [...value.optionalContractKeys].sort(), allowedActions: [...value.allowedActions].sort() });
}
function allContracts() { return ['activeModelCalculationPackage','activeModelCalculationReport','flexuralPropertyProjection','loadCaseSet','loadPrimitiveSet','modelCalculationLedger','modelLoadReadinessAudit','restraintCapabilityAudit','restraintCapabilityModel','sharedModel','supportAttachmentAudit','supportAttachmentModel','supportLoadScreening','supportLoadScreeningAudit','topologyAudit','topologyGraph','verticalBeamModel','verticalBeamSolution','verticalBeamSolverAudit','verticalLoadPathModel']; }
function reportsRequired() { return ['activeModelCalculationPackage','activeModelCalculationReport','modelCalculationLedger']; }
function reportsOptional() { return ['supportLoadScreening','verticalBeamSolution']; }
function workspaceActions() { return ['CLEAR_DATASET','CREATE_CALCULATION_PACKAGE','EXPORT_ARCHIVED_PACKAGE','IMPORT_DATASET','RUN_SCREENING','SELECT_ARCHIVED_PACKAGE','SELECT_ENTITY','SOLVE_VERTICAL_BEAM']; }
function reportsActions() { return ['EXPORT_ARCHIVED_PACKAGE','SELECT_ARCHIVED_PACKAGE']; }
function compareIds(left, right) { return left.consumerId < right.consumerId ? -1 : left.consumerId > right.consumerId ? 1 : 0; }
