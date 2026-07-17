import { canonicalStringify, deepFreeze, semanticHash, stringValue } from '../shared-piping-model/index.js';
import { CONSUMER_IDS, IMPLEMENTATION_STATUS, WORKSPACE_CONSUMER_REGISTRY_SCHEMA } from './constants.js';

export function createWorkspaceConsumerRegistry() { return canonicalRegistry(); }

export function validateWorkspaceConsumerRegistry(value) {
  const errors = [];
  const expected = canonicalRegistry();
  if (value?.schema !== WORKSPACE_CONSUMER_REGISTRY_SCHEMA) errors.push('Invalid workspace consumer registry schema.');
  if (canonicalStringify(value) !== canonicalStringify(expected)) errors.push('Workspace consumer registry does not match the closed W10.8 registry.');
  return deepFreeze({ ok: errors.length === 0, errors });
}

export function workspaceConsumerDescriptor(registry, consumerId) {
  if (!validateWorkspaceConsumerRegistry(registry).ok) throw new TypeError('Workspace consumer registry is invalid.');
  const descriptor = registry.consumers.find((row) => row.consumerId === consumerId);
  if (!descriptor) throw new TypeError(`Unknown workspace consumer: ${consumerId}.`);
  return descriptor;
}

function canonicalRegistry() {
  const consumers = descriptorRows().map(normalizeDescriptor).sort((a, b) => a.consumerId.localeCompare(b.consumerId));
  const base = { schema: WORKSPACE_CONSUMER_REGISTRY_SCHEMA, consumers };
  return deepFreeze({ ...base, semanticHash: semanticHash(base) });
}
function descriptorRows() {
  return [
    row(CONSUMER_IDS.WORKSPACE, 'Workspace', 'Current model review and explicit analysis actions.', IMPLEMENTATION_STATUS.IMPLEMENTED, [], allContracts(), workspaceActions(), 'EXISTING_CONTRACT_CLAIMS_ONLY'),
    row(CONSUMER_IDS.REPORTS, 'Reports', 'Review and export the active archived W10.7 package report.', IMPLEMENTATION_STATUS.IMPLEMENTED, reportsRequired(), reportsOptional(), reportsActions(), 'ARCHIVED_REPORT_EVIDENCE_ONLY'),
    row(CONSUMER_IDS.LOAD_CALC, 'Load Calc', 'Future reusable load-calculation consumer.', IMPLEMENTATION_STATUS.NOT_IMPLEMENTED, ['loadCaseSet','loadPrimitiveSet','modelLoadReadinessAudit','sharedModel'], ['supportLoadScreening','verticalLoadPathModel'], [], 'NO_ENGINEERING_CLAIMS'),
    row(CONSUMER_IDS.THREE_D_CALC, '3D Calc', 'Future three-dimensional calculation consumer.', IMPLEMENTATION_STATUS.NOT_IMPLEMENTED, ['restraintCapabilityModel','sharedModel','supportAttachmentModel','topologyGraph'], ['loadPrimitiveSet','verticalBeamSolution'], [], 'NO_ENGINEERING_CLAIMS'),
    row(CONSUMER_IDS.PIPE_SOLVER, 'Pipe Solver', 'Future piping solver consumer.', IMPLEMENTATION_STATUS.NOT_IMPLEMENTED, ['loadCaseSet','loadPrimitiveSet','restraintCapabilityModel','sharedModel','supportAttachmentModel','topologyGraph'], ['flexuralPropertyProjection','verticalBeamModel'], [], 'NO_ENGINEERING_CLAIMS'),
    row(CONSUMER_IDS.QA, 'QA', 'Future contract quality-assurance consumer.', IMPLEMENTATION_STATUS.NOT_IMPLEMENTED, ['sharedModel'], allContracts().filter((key) => key !== 'sharedModel'), [], 'NO_ENGINEERING_CLAIMS'),
    row(CONSUMER_IDS.DEBUG, 'Debug', 'Future read-only contract inspection consumer.', IMPLEMENTATION_STATUS.NOT_IMPLEMENTED, [], allContracts(), [], 'NO_ENGINEERING_CLAIMS'),
  ];
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
