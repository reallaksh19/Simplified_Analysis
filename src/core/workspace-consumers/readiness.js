import { deepFreeze, semanticHash } from '../shared-piping-model/index.js';
import { IMPLEMENTATION_STATUS, READINESS_SCHEMA, READINESS_STATES } from './constants.js';
import { assertConsumerId, getConsumerDescriptor } from './registry.js';

export function createWorkspaceConsumerReadiness(registry, context, consumerId) {
  assertConsumerId(consumerId);
  const descriptor = getConsumerDescriptor(registry, consumerId);
  const availableContractKeys = descriptor.requiredContractKeys.filter((key) => context.contracts[key]);
  const missingRequiredContractKeys = descriptor.requiredContractKeys.filter((key) => !context.contracts[key]);
  const invalidContractKeys = context.diagnostics.filter((row) => row.severity === 'ERROR').map((row) => row.scope).filter((key) => descriptor.requiredContractKeys.includes(key)).sort();
  const readinessState = resolveState(descriptor, missingRequiredContractKeys, invalidContractKeys);
  const blockers = buildBlockers(readinessState, missingRequiredContractKeys, invalidContractKeys);
  const base = {
    schema: READINESS_SCHEMA,
    consumerId,
    implementationStatus: descriptor.implementationStatus,
    readinessState,
    availableContractKeys: [...availableContractKeys].sort(),
    missingRequiredContractKeys: [...missingRequiredContractKeys].sort(),
    invalidContractKeys,
    blockers,
    diagnostics: context.diagnostics.filter((row) => descriptor.requiredContractKeys.includes(row.scope)),
    contextSemanticHash: context.semanticHash,
  };
  return deepFreeze({ ...base, semanticHash: semanticHash(base) });
}

export function validateWorkspaceConsumerReadiness(value) {
  const ok = value?.schema === READINESS_SCHEMA && Object.values(READINESS_STATES).includes(value.readinessState);
  return deepFreeze({ ok, errors: ok ? [] : ['invalid workspace consumer readiness'] });
}

function resolveState(descriptor, missing, invalid) {
  if (descriptor.implementationStatus === IMPLEMENTATION_STATUS.NOT_IMPLEMENTED) return READINESS_STATES.NOT_IMPLEMENTED;
  if (invalid.length) return READINESS_STATES.INVALID;
  if (missing.length) return READINESS_STATES.MISSING;
  return READINESS_STATES.AVAILABLE;
}
function buildBlockers(state, missing, invalid) {
  if (state === READINESS_STATES.NOT_IMPLEMENTED) return ['CONSUMER_NOT_IMPLEMENTED'];
  return [...missing.map((key) => `MISSING_CONTRACT:${key}`), ...invalid.map((key) => `INVALID_CONTRACT:${key}`)].sort();
}