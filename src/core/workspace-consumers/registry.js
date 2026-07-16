import { deepFreeze, semanticHash } from '../shared-piping-model/index.js';
import {
  CONSUMER_IDS,
  CONTRACT_KEYS,
  IMPLEMENTATION_STATUS,
  WORKSPACE_CONSUMER_REGISTRY_SCHEMA,
} from './constants.js';

export function createWorkspaceConsumerRegistry(sourceDescriptors = descriptorRows()) {
  const consumers = sourceDescriptors.map(normalizeDescriptor)
    .sort((left, right) => left.consumerId.localeCompare(right.consumerId));
  const base = { schema: WORKSPACE_CONSUMER_REGISTRY_SCHEMA, consumers };
  return deepFreeze({ ...base, semanticHash: semanticHash(base) });
}

export function validateWorkspaceConsumerRegistry(value) {
  const errors = [];
  if (value?.schema !== WORKSPACE_CONSUMER_REGISTRY_SCHEMA) errors.push('Invalid workspace consumer registry schema.');
  const ids = (value?.consumers || []).map((row) => row.consumerId);
  const required = Object.values(CONSUMER_IDS).sort();
  if (ids.length !== required.length || required.some((id) => !ids.includes(id))) errors.push('Workspace consumer registry IDs are incomplete.');
  if (new Set(ids).size !== ids.length) errors.push('Workspace consumer registry IDs must be unique.');
  (value?.consumers || []).forEach((row) => validateDescriptor(row, errors));
  if (value?.semanticHash !== semanticHash(withoutHash(value))) errors.push('Workspace consumer registry semantic hash mismatch.');
  return deepFreeze({ ok: errors.length === 0, errors });
}

export function workspaceConsumerDescriptor(registry, consumerId) {
  const descriptor = registry?.consumers?.find((row) => row.consumerId === consumerId);
  if (!descriptor) throw new TypeError(`Unknown workspace consumer: ${consumerId}.`);
  return descriptor;
}

function descriptorRows() {
  return [
    descriptor(CONSUMER_IDS.WORKSPACE, 'Workspace', 'Current model review and explicit analysis actions.', IMPLEMENTATION_STATUS.IMPLEMENTED, [], allModelContracts(), workspaceActions(), 'EXISTING_CONTRACT_CLAIMS_ONLY'),
    descriptor(CONSUMER_IDS.REPORTS, 'Reports', 'Review and export the active archived W10.7 package report.', IMPLEMENTATION_STATUS.IMPLEMENTED, reportRequired(), reportOptional(), reportActions(), 'ARCHIVED_REPORT_EVIDENCE_ONLY'),
    descriptor(CONSUMER_IDS.LOAD_CALC, 'Load Calc', 'Future reusable load-calculation consumer.', IMPLEMENTATION_STATUS.NOT_IMPLEMENTED, ['sharedModel', 'loadCaseSet', 'loadPrimitiveSet', 'modelLoadReadinessAudit'], ['verticalLoadPathModel', 'supportLoadScreening'], [], 'NO_ENGINEERING_CLAIMS'),
    descriptor(CONSUMER_IDS.THREE_D_CALC, '3D Calc', 'Future three-dimensional calculation consumer.', IMPLEMENTATION_STATUS.NOT_IMPLEMENTED, ['sharedModel', 'topologyGraph', 'supportAttachmentModel', 'restraintCapabilityModel'], ['loadPrimitiveSet', 'verticalBeamSolution'], [], 'NO_ENGINEERING_CLAIMS'),
    descriptor(CONSUMER_IDS.PIPE_SOLVER, 'Pipe Solver', 'Future piping solver consumer.', IMPLEMENTATION_STATUS.NOT_IMPLEMENTED, ['sharedModel', 'topologyGraph', 'supportAttachmentModel', 'restraintCapabilityModel', 'loadCaseSet', 'loadPrimitiveSet'], ['flexuralPropertyProjection', 'verticalBeamModel'], [], 'NO_ENGINEERING_CLAIMS'),
    descriptor(CONSUMER_IDS.QA, 'QA', 'Future contract quality-assurance consumer.', IMPLEMENTATION_STATUS.NOT_IMPLEMENTED, ['sharedModel'], allModelContracts(), [], 'NO_ENGINEERING_CLAIMS'),
    descriptor(CONSUMER_IDS.DEBUG, 'Debug', 'Future read-only contract inspection consumer.', IMPLEMENTATION_STATUS.NOT_IMPLEMENTED, [], allModelContracts(), [], 'NO_ENGINEERING_CLAIMS'),
  ];
}

function descriptor(consumerId, label, purpose, implementationStatus, required, optional, actions, policy) {
  return normalizeDescriptor({ consumerId, label, purpose, implementationStatus, requiredContractKeys: required, optionalContractKeys: optional, allowedActions: actions, engineeringClaimPolicy: policy });
}

function normalizeDescriptor(value) {
  const required = [...new Set(value.requiredContractKeys || [])].sort();
  const optional = [...new Set(value.optionalContractKeys || [])].filter((key) => !required.includes(key)).sort();
  return deepFreeze({
    consumerId: value.consumerId,
    label: value.label,
    purpose: value.purpose,
    implementationStatus: value.implementationStatus,
    requiredContractKeys: required,
    optionalContractKeys: optional,
    allowedActions: [...new Set(value.allowedActions || [])].sort(),
    engineeringClaimPolicy: value.engineeringClaimPolicy,
  });
}

function validateDescriptor(row, errors) {
  if (!Object.values(CONSUMER_IDS).includes(row?.consumerId)) errors.push('Workspace consumer descriptor ID is invalid.');
  if (!Object.values(IMPLEMENTATION_STATUS).includes(row?.implementationStatus)) errors.push(`Workspace consumer ${row?.consumerId || ''} implementation status is invalid.`);
  if (typeof row?.label !== 'string' || !row.label) errors.push(`Workspace consumer ${row?.consumerId || ''} label is invalid.`);
  if (typeof row?.purpose !== 'string' || !row.purpose) errors.push(`Workspace consumer ${row?.consumerId || ''} purpose is invalid.`);
  if (typeof row?.engineeringClaimPolicy !== 'string' || !row.engineeringClaimPolicy) errors.push(`Workspace consumer ${row?.consumerId || ''} claim policy is invalid.`);
  ['requiredContractKeys', 'optionalContractKeys', 'allowedActions'].forEach((field) => {
    if (!Array.isArray(row?.[field])) errors.push(`Workspace consumer ${row?.consumerId || ''} ${field} is invalid.`);
  });
  [...(row?.requiredContractKeys || []), ...(row?.optionalContractKeys || [])].forEach((key) => {
    if (!CONTRACT_KEYS.includes(key)) errors.push(`Workspace consumer ${row?.consumerId || ''} contract key ${key} is invalid.`);
  });
}

function allModelContracts() {
  return [
    'sharedModel', 'topologyGraph', 'topologyAudit', 'supportAttachmentModel',
    'supportAttachmentAudit', 'restraintCapabilityModel', 'restraintCapabilityAudit',
    'loadCaseSet', 'loadPrimitiveSet', 'modelLoadReadinessAudit', 'verticalLoadPathModel',
    'supportLoadScreening', 'supportLoadScreeningAudit', 'flexuralPropertyProjection',
    'verticalBeamModel', 'verticalBeamSolution', 'verticalBeamSolverAudit',
    'modelCalculationLedger', 'activeModelCalculationPackage', 'activeModelCalculationReport',
  ];
}
function reportRequired() { return ['modelCalculationLedger', 'activeModelCalculationPackage', 'activeModelCalculationReport']; }
function reportOptional() { return ['supportLoadScreening', 'verticalBeamSolution']; }
function workspaceActions() { return ['IMPORT_DATASET', 'CLEAR_DATASET', 'SELECT_ENTITY', 'RUN_SCREENING', 'SOLVE_VERTICAL_BEAM', 'CREATE_CALCULATION_PACKAGE', 'SELECT_ARCHIVED_PACKAGE', 'EXPORT_ARCHIVED_PACKAGE']; }
function reportActions() { return ['SELECT_ARCHIVED_PACKAGE', 'EXPORT_ARCHIVED_PACKAGE']; }
function withoutHash(value) { const { semanticHash: _semanticHash, ...rest } = value || {}; return rest; }
