import { canonicalStringify, deepFreeze, semanticHash, stringValue } from '../shared-piping-model/index.js';
import {
  CONSUMER_IDS,
  IMPLEMENTATION_STATUS,
  WORKSPACE_CONSUMER_REGISTRY_SCHEMA,
  WORKSPACE_CONSUMER_REGISTRY_V2_SCHEMA,
} from './constants.js';

export function createWorkspaceConsumerRegistry() { return canonicalRegistry(1); }
export function createWorkspaceConsumerRegistryV2() { return canonicalRegistry(2); }

export function validateWorkspaceConsumerRegistry(value) {
  const v1 = canonicalRegistry(1), v2 = canonicalRegistry(2);
  const valid = canonicalStringify(value) === canonicalStringify(v1)
    || canonicalStringify(value) === canonicalStringify(v2);
  return deepFreeze({ ok: valid, errors: valid ? [] : ['Workspace consumer registry does not match a closed supported registry version.'] });
}

export function validateWorkspaceConsumerRegistryV1(value) {
  return validateExact(value, canonicalRegistry(1), WORKSPACE_CONSUMER_REGISTRY_SCHEMA);
}

export function validateWorkspaceConsumerRegistryV2(value) {
  return validateExact(value, canonicalRegistry(2), WORKSPACE_CONSUMER_REGISTRY_V2_SCHEMA);
}

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
  const consumers = descriptorRows(version).map(normalizeDescriptor)
    .sort((a, b) => a.consumerId.localeCompare(b.consumerId));
  const schema = version === 2 ? WORKSPACE_CONSUMER_REGISTRY_V2_SCHEMA : WORKSPACE_CONSUMER_REGISTRY_SCHEMA;
  const base = { schema, consumers };
  return deepFreeze({ ...base, semanticHash: semanticHash(base) });
}

function descriptorRows(version) {
  return [
    row(CONSUMER_IDS.WORKSPACE, 'Workspace', 'Current model review and explicit analysis actions.', IMPLEMENTATION_STATUS.IMPLEMENTED, [], allContracts(), workspaceActions(), 'EXISTING_CONTRACT_CLAIMS_ONLY'),
    row(CONSUMER_IDS.REPORTS, 'Reports', 'Review and export the active archived W10.7 package report.', IMPLEMENTATION_STATUS.IMPLEMENTED, reportsRequired(), reportsOptional(), reportsActions(), 'ARCHIVED_REPORT_EVIDENCE_ONLY'),
    loadCalcRow(version),
    row(CONSUMER_IDS.THREE_D_CALC, '3D Calc', 'Future three-dimensional calculation consumer.', IMPLEMENTATION_STATUS.NOT_IMPLEMENTED, ['restraintCapabilityModel','sharedModel','supportAttachmentModel','topologyGraph'], ['loadPrimitiveSet','verticalBeamSolution'], [], 'NO_ENGINEERING_CLAIMS'),
    row(CONSUMER_IDS.PIPE_SOLVER, 'Pipe Solver', 'Future piping solver consumer.', IMPLEMENTATION_STATUS.NOT_IMPLEMENTED, ['loadCaseSet','loadPrimitiveSet','restraintCapabilityModel','sharedModel','supportAttachmentModel','topologyGraph'], ['flexuralPropertyProjection','verticalBeamModel'], [], 'NO_ENGINEERING_CLAIMS'),
    row(CONSUMER_IDS.QA, 'QA', 'Future contract quality-assurance consumer.', IMPLEMENTATION_STATUS.NOT_IMPLEMENTED, ['sharedModel'], allContracts().filter((key) => key !== 'sharedModel'), [], 'NO_ENGINEERING_CLAIMS'),
    row(CONSUMER_IDS.DEBUG, 'Debug', 'Future read-only contract inspection consumer.', IMPLEMENTATION_STATUS.NOT_IMPLEMENTED, [], allContracts(), [], 'NO_ENGINEERING_CLAIMS'),
  ];
}

function loadCalcRow(version) {
  if (version === 1) return row(CONSUMER_IDS.LOAD_CALC, 'Load Calc', 'Future reusable load-calculation consumer.', IMPLEMENTATION_STATUS.NOT_IMPLEMENTED, ['loadCaseSet','loadPrimitiveSet','modelLoadReadinessAudit','sharedModel'], ['supportLoadScreening','verticalLoadPathModel'], [], 'NO_ENGINEERING_CLAIMS');
  return row(
    CONSUMER_IDS.LOAD_CALC,
    'Load Calc',
    'Review exact W10.4 model-load evidence and optional W10.5 tributary screening.',
    IMPLEMENTATION_STATUS.IMPLEMENTED,
    ['sharedModel','loadCaseSet','loadPrimitiveSet','modelLoadReadinessAudit'],
    ['verticalLoadPathModel','supportLoadScreening','supportLoadScreeningAudit'],
    ['REBUILD_MODEL_LOADS','EXPORT_MODEL_LOADS','REBUILD_VERTICAL_LOAD_PATHS','RUN_TRIBUTARY_SCREENING','EXPORT_TRIBUTARY_SCREENING'],
    'MODEL_LOAD_EVIDENCE_AND_OPTIONAL_TRIBUTARY_SCREENING_ONLY',
  );
}

function row(consumerId, label, purpose, implementationStatus, required, optional, actions, policy) {
  return { consumerId, label, purpose, implementationStatus, requiredContractKeys: required, optionalContractKeys: optional, allowedActions: actions, engineeringClaimPolicy: policy };
}
function normalizeDescriptor(value) {
  if (!stringValue(value.purpose) || !stringValue(value.engineeringClaimPolicy)) throw new TypeError('Consumer descriptor text is required.');
  return deepFreeze({ ...value, requiredContractKeys: [...value.requiredContractKeys].sort(), optionalContractKeys: [...value.optionalContractKeys].sort(), allowedActions: [...value.allowedActions].sort() });
}
function allContracts() { return ['activeModelCalculationPackage','activeModelCalculationReport','flexuralPropertyProjection','loadCaseSet','loadPrimitiveSet','modelCalculationLedger','modelLoadReadinessAudit','restraintCapabilityAudit','restraintCapabilityModel','sharedModel','supportAttachmentAudit','supportAttachmentModel','supportLoadScreening','supportLoadScreeningAudit','topologyAudit','topologyGraph','verticalBeamModel','verticalBeamSolution','verticalBeamSolverAudit','verticalLoadPathModel']; }
function reportsRequired() { return ['activeModelCalculationPackage','activeModelCalculationReport','modelCalculationLedger']; }
function reportsOptional() { return ['supportLoadScreening','verticalBeamSolution']; }
function workspaceActions() { return ['CLEAR_DATASET','CREATE_CALCULATION_PACKAGE','EXPORT_ARCHIVED_PACKAGE','IMPORT_DATASET','RUN_SCREENING','SELECT_ARCHIVED_PACKAGE','SELECT_ENTITY','SOLVE_VERTICAL_BEAM']; }
function reportsActions() { return ['EXPORT_ARCHIVED_PACKAGE','SELECT_ARCHIVED_PACKAGE']; }
