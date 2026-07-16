import { deepFreeze, semanticHash } from '../shared-piping-model/index.js';
import {
  IMPLEMENTATION_STATUS,
  READINESS_STATES,
  WORKSPACE_CONSUMER_READINESS_SCHEMA,
} from './constants.js';
import { workspaceConsumerDescriptor } from './registry.js';

export function createWorkspaceConsumerReadiness(registry, context, consumerId, options = {}) {
  const descriptor = workspaceConsumerDescriptor(registry, consumerId);
  const available = new Set(context?.availabilitySummary?.availableContractKeys || []);
  const invalid = new Set(context?.availabilitySummary?.invalidContractKeys || []);
  const required = descriptor.requiredContractKeys;
  const declared = [...new Set([...required, ...descriptor.optionalContractKeys])].sort();
  const availableContractKeys = declared.filter((key) => available.has(key));
  const invalidContractKeys = declared.filter((key) => invalid.has(key));
  const invalidRequiredContractKeys = required.filter((key) => invalid.has(key)).sort();
  const missingRequiredContractKeys = required.filter((key) => !available.has(key) && !invalid.has(key)).sort();
  const readinessState = readinessStateFor(descriptor, invalidRequiredContractKeys, missingRequiredContractKeys, options);
  const blockers = blockersFor(readinessState, invalidRequiredContractKeys, missingRequiredContractKeys);
  const base = {
    schema: WORKSPACE_CONSUMER_READINESS_SCHEMA,
    consumerId,
    implementationStatus: descriptor.implementationStatus,
    readinessState,
    availableContractKeys,
    missingRequiredContractKeys,
    invalidContractKeys,
    blockers,
    diagnostics: readinessDiagnostics(readinessState, invalidRequiredContractKeys, missingRequiredContractKeys),
    contextSemanticHash: context?.semanticHash || null,
  };
  return deepFreeze({ ...base, semanticHash: semanticHash(base) });
}

export function validateWorkspaceConsumerReadiness(value) {
  const errors = [];
  if (value?.schema !== WORKSPACE_CONSUMER_READINESS_SCHEMA) errors.push('Invalid workspace consumer readiness schema.');
  if (!Object.values(IMPLEMENTATION_STATUS).includes(value?.implementationStatus)) errors.push('Workspace consumer implementation status is invalid.');
  if (!Object.values(READINESS_STATES).includes(value?.readinessState)) errors.push('Workspace consumer readiness state is invalid.');
  ['availableContractKeys', 'missingRequiredContractKeys', 'invalidContractKeys', 'blockers', 'diagnostics'].forEach((field) => {
    if (!Array.isArray(value?.[field])) errors.push(`Workspace consumer readiness ${field} is invalid.`);
  });
  if (value?.semanticHash !== semanticHash(withoutHash(value))) errors.push('Workspace consumer readiness semantic hash mismatch.');
  return deepFreeze({ ok: errors.length === 0, errors });
}

export function createWorkspaceConsumerReadinessRegistry(registry, context, options = {}) {
  return deepFreeze(registry.consumers.map((descriptor) => (
    createWorkspaceConsumerReadiness(registry, context, descriptor.consumerId, options)
  )).sort((left, right) => left.consumerId.localeCompare(right.consumerId)));
}

function readinessStateFor(descriptor, invalid, missing, options) {
  if (descriptor.implementationStatus === IMPLEMENTATION_STATUS.NOT_IMPLEMENTED) return READINESS_STATES.NOT_IMPLEMENTED;
  if (descriptor.consumerId === 'WORKSPACE' && options.workspaceBooted !== true) return READINESS_STATES.BLOCKED_MISSING_CONTRACTS;
  if (invalid.length) return READINESS_STATES.BLOCKED_INVALID_CONTRACTS;
  if (missing.length) return READINESS_STATES.BLOCKED_MISSING_CONTRACTS;
  return READINESS_STATES.AVAILABLE;
}

function blockersFor(state, invalid, missing) {
  if (state === READINESS_STATES.NOT_IMPLEMENTED) return ['CONSUMER_NOT_IMPLEMENTED'];
  if (state === READINESS_STATES.BLOCKED_INVALID_CONTRACTS) return invalid.map((key) => `INVALID_CONTRACT:${key}`);
  if (state === READINESS_STATES.BLOCKED_MISSING_CONTRACTS) return missing.length
    ? missing.map((key) => `MISSING_CONTRACT:${key}`) : ['WORKSPACE_NOT_BOOTED'];
  return [];
}

function readinessDiagnostics(state, invalid, missing) {
  if (state === READINESS_STATES.NOT_IMPLEMENTED) return [diagnostic('CONSUMER_NOT_IMPLEMENTED', 'Current-runtime implementation is not available.')];
  if (state === READINESS_STATES.BLOCKED_INVALID_CONTRACTS) return invalid.map((key) => diagnostic('INVALID_REQUIRED_CONTRACT', `Required contract ${key} is invalid or stale.`, key));
  if (state === READINESS_STATES.BLOCKED_MISSING_CONTRACTS) return missing.length
    ? missing.map((key) => diagnostic('MISSING_REQUIRED_CONTRACT', `Required contract ${key} is unavailable.`, key))
    : [diagnostic('WORKSPACE_NOT_BOOTED', 'The current Workspace shell is not booted.')];
  return [];
}

function diagnostic(code, message, contractKey = null) {
  return deepFreeze({ code, severity: 'INFO', contractKey, message });
}
function withoutHash(value) { const { semanticHash: _semanticHash, ...rest } = value || {}; return rest; }
