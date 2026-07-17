import { canonicalStringify, deepFreeze, semanticHash } from '../shared-piping-model/index.js';
import { IMPLEMENTATION_STATUS, READINESS_STATES, WORKSPACE_CONSUMER_READINESS_SCHEMA } from './constants.js';
import { validateWorkspaceConsumerContext } from './context.js';
import { validateWorkspaceConsumerRegistry, workspaceConsumerDescriptor } from './registry.js';

export function createWorkspaceConsumerReadiness(registry, context, consumerId, options = {}) {
  const descriptor = workspaceConsumerDescriptor(registry, consumerId);
  const available = new Set(context?.availabilitySummary?.availableContractKeys || []);
  const invalid = new Set(context?.availabilitySummary?.invalidContractKeys || []);
  const required = descriptor.requiredContractKeys;
  const declared = [...new Set([...required, ...descriptor.optionalContractKeys])].sort();
  const invalidRequired = required.filter((key) => invalid.has(key)).sort();
  const missingRequired = required.filter((key) => !available.has(key) && !invalid.has(key)).sort();
  const readinessState = stateFor(descriptor, invalidRequired, missingRequired, options);
  const base = {
    schema: WORKSPACE_CONSUMER_READINESS_SCHEMA,
    consumerId,
    implementationStatus: descriptor.implementationStatus,
    readinessState,
    availableContractKeys: declared.filter((key) => available.has(key)),
    missingRequiredContractKeys: missingRequired,
    invalidContractKeys: declared.filter((key) => invalid.has(key)),
    blockers: blockersFor(readinessState, invalidRequired, missingRequired),
    diagnostics: diagnosticsFor(readinessState, invalidRequired, missingRequired),
    contextSemanticHash: context?.semanticHash || null,
  };
  return deepFreeze({ ...base, semanticHash: semanticHash(base) });
}

export function validateWorkspaceConsumerReadiness(value, registry, context, options = {}) {
  const errors = validateWorkspaceConsumerReadinessShape(value).errors.slice();
  if (!validateWorkspaceConsumerRegistry(registry).ok) errors.push('Workspace consumer readiness registry is invalid.');
  if (!validateWorkspaceConsumerContext(context).ok) errors.push('Workspace consumer readiness context is invalid.');
  if (!errors.length) {
    try {
      const expected = createWorkspaceConsumerReadiness(registry, context, value.consumerId, options);
      if (canonicalStringify(value) !== canonicalStringify(expected)) errors.push('Workspace consumer readiness does not match registry and context evidence.');
    } catch (error) { errors.push(error.message); }
  }
  return deepFreeze({ ok: errors.length === 0, errors });
}

export function validateWorkspaceConsumerReadinessShape(value) {
  const errors = [];
  if (value?.schema !== WORKSPACE_CONSUMER_READINESS_SCHEMA) errors.push('Invalid workspace consumer readiness schema.');
  if (typeof value?.consumerId !== 'string' || !value.consumerId) errors.push('Workspace consumer readiness consumerId is invalid.');
  if (!Object.values(IMPLEMENTATION_STATUS).includes(value?.implementationStatus)) errors.push('Workspace consumer implementation status is invalid.');
  if (!Object.values(READINESS_STATES).includes(value?.readinessState)) errors.push('Workspace consumer readiness state is invalid.');
  ['availableContractKeys','missingRequiredContractKeys','invalidContractKeys','blockers','diagnostics'].forEach((field) => validateCanonicalArray(value?.[field], field, errors));
  if (value?.implementationStatus === IMPLEMENTATION_STATUS.NOT_IMPLEMENTED && value?.readinessState !== READINESS_STATES.NOT_IMPLEMENTED) errors.push('A non-implemented consumer must remain NOT_IMPLEMENTED.');
  if (value?.implementationStatus === IMPLEMENTATION_STATUS.IMPLEMENTED && value?.readinessState === READINESS_STATES.NOT_IMPLEMENTED) errors.push('An implemented consumer cannot report NOT_IMPLEMENTED.');
  if (value?.readinessState === READINESS_STATES.AVAILABLE && (value?.missingRequiredContractKeys?.length || value?.invalidContractKeys?.length || value?.blockers?.length)) errors.push('AVAILABLE readiness contains blockers.');
  if (value?.readinessState === READINESS_STATES.BLOCKED_MISSING_CONTRACTS && !value?.missingRequiredContractKeys?.length && !value?.blockers?.includes('WORKSPACE_NOT_BOOTED')) errors.push('Missing-contract readiness has no missing contract.');
  if (value?.readinessState === READINESS_STATES.BLOCKED_INVALID_CONTRACTS && !value?.invalidContractKeys?.length) errors.push('Invalid-contract readiness has no invalid contract.');
  if (value?.semanticHash !== semanticHash(withoutHash(value))) errors.push('Workspace consumer readiness semantic hash mismatch.');
  return deepFreeze({ ok: errors.length === 0, errors });
}

export function createWorkspaceConsumerReadinessRegistry(registry, context, options = {}) {
  return deepFreeze(registry.consumers.map((row) => createWorkspaceConsumerReadiness(registry, context, row.consumerId, options)).sort((a, b) => a.consumerId.localeCompare(b.consumerId)));
}
function stateFor(descriptor, invalid, missing, options) {
  if (descriptor.implementationStatus === IMPLEMENTATION_STATUS.NOT_IMPLEMENTED) return READINESS_STATES.NOT_IMPLEMENTED;
  if (descriptor.consumerId === 'WORKSPACE' && options.workspaceBooted !== true) return READINESS_STATES.BLOCKED_MISSING_CONTRACTS;
  if (invalid.length) return READINESS_STATES.BLOCKED_INVALID_CONTRACTS;
  if (missing.length) return READINESS_STATES.BLOCKED_MISSING_CONTRACTS;
  return READINESS_STATES.AVAILABLE;
}
function blockersFor(state, invalid, missing) {
  if (state === READINESS_STATES.NOT_IMPLEMENTED) return ['CONSUMER_NOT_IMPLEMENTED'];
  if (state === READINESS_STATES.BLOCKED_INVALID_CONTRACTS) return invalid.map((key) => `INVALID_CONTRACT:${key}`);
  if (state === READINESS_STATES.BLOCKED_MISSING_CONTRACTS) return missing.length ? missing.map((key) => `MISSING_CONTRACT:${key}`) : ['WORKSPACE_NOT_BOOTED'];
  return [];
}
function diagnosticsFor(state, invalid, missing) {
  if (state === READINESS_STATES.NOT_IMPLEMENTED) return [diagnostic('CONSUMER_NOT_IMPLEMENTED','This consumer is not implemented in the current runtime.')];
  if (state === READINESS_STATES.BLOCKED_INVALID_CONTRACTS) return invalid.map((key) => diagnostic('INVALID_REQUIRED_CONTRACT',`Required contract ${key} is invalid or stale.`,key));
  if (state === READINESS_STATES.BLOCKED_MISSING_CONTRACTS) return missing.length ? missing.map((key) => diagnostic('MISSING_REQUIRED_CONTRACT',`Required contract ${key} is unavailable.`,key)) : [diagnostic('WORKSPACE_NOT_BOOTED','The current Workspace shell is not booted.')];
  return [];
}
function validateCanonicalArray(value, field, errors) {
  if (!Array.isArray(value)) { errors.push(`Workspace consumer readiness ${field} is invalid.`); return; }
  if (field !== 'diagnostics' && canonicalStringify(value) !== canonicalStringify([...new Set(value)].sort())) errors.push(`Workspace consumer readiness ${field} is not canonical.`);
}
function diagnostic(code, message, contractKey = null) { return deepFreeze({ code, severity: 'INFO', contractKey, message }); }
function withoutHash(value) { const { semanticHash: _hash, ...base } = value || {}; return base; }
