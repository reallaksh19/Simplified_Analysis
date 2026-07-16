import {
  deepFreeze,
  semanticHash,
  stringValue,
} from '../shared-piping-model/index.js';
import {
  CONTRACT_KEYS,
  WORKSPACE_CONSUMER_CONTEXT_SCHEMA,
} from './constants.js';
import {
  contractDatasetId,
  contractLinkError,
  validateConsumerContract,
} from './validators.js';

export function createWorkspaceConsumerContext(input = {}) {
  const metadata = contextMetadata(input);
  const state = collectContracts(metadata.datasetId, input.contracts || {});
  const references = deepFreeze(CONTRACT_KEYS.map((key) => contractReference(key, state)));
  const diagnostics = deepFreeze([...state.diagnostics].sort(diagnosticOrder));
  const availabilitySummary = availability(references, diagnostics);
  const identity = {
    schema: WORKSPACE_CONSUMER_CONTEXT_SCHEMA,
    ...metadata,
    contractReferences: references,
    availabilitySummary,
    diagnostics,
  };
  const contextId = `workspace-consumer-context:${semanticHash(identity).split(':')[1]}`;
  const hashPayload = { ...identity, contextId };
  return Object.freeze({
    ...hashPayload,
    contracts: state.contracts,
    semanticHash: semanticHash(hashPayload),
  });
}

export function validateWorkspaceConsumerContext(value) {
  const errors = [];
  if (value?.schema !== WORKSPACE_CONSUMER_CONTEXT_SCHEMA) errors.push('Invalid workspace consumer context schema.');
  if (!stringValue(value?.contextId)) errors.push('Workspace consumer contextId is required.');
  if (!Number.isInteger(value?.workspaceVersion) || value.workspaceVersion < 0) errors.push('Workspace consumer version is invalid.');
  if (!Array.isArray(value?.contractReferences) || value.contractReferences.length !== CONTRACT_KEYS.length) errors.push('Workspace consumer contract references are incomplete.');
  if (!value?.contracts || typeof value.contracts !== 'object') errors.push('Workspace consumer contracts are required.');
  validateContextReferences(value, errors);
  if (value?.semanticHash !== semanticHash(contextHashPayload(value))) errors.push('Workspace consumer semantic hash mismatch.');
  if (value?.contextId !== contextIdFor(value)) errors.push('Workspace consumer contextId mismatch.');
  return deepFreeze({ ok: errors.length === 0, errors });
}

function validateContextReferences(value, errors) {
  const references = value?.contractReferences || [];
  const keys = references.map((row) => row?.contractKey);
  if (keys.some((key, index) => key !== CONTRACT_KEYS[index])) errors.push('Workspace consumer contract references are not canonically ordered.');
  CONTRACT_KEYS.forEach((key) => {
    if (!(key in (value?.contracts || {}))) errors.push(`Workspace consumer contract slot ${key} is missing.`);
    const contract = value?.contracts?.[key] || null;
    const reference = references.find((row) => row.contractKey === key);
    if (contract && (reference?.semanticHash !== contract.semanticHash || reference?.schema !== contract.schema)) {
      errors.push(`Workspace consumer contract reference ${key} does not match its contract.`);
    }
    if (!contract && reference?.availability === 'AVAILABLE') errors.push(`Workspace consumer contract reference ${key} is falsely available.`);
  });
}

function collectContracts(datasetId, sourceContracts) {
  const contracts = {};
  const diagnostics = [];
  CONTRACT_KEYS.forEach((contractKey) => {
    const source = sourceContracts[contractKey] ?? null;
    const result = acceptContract(contractKey, source, datasetId, contracts);
    contracts[contractKey] = result.value;
    if (result.diagnostic) diagnostics.push(result.diagnostic);
  });
  return { contracts: Object.freeze(contracts), diagnostics };
}

function acceptContract(contractKey, value, datasetId, accepted) {
  if (value === null) return { value: null, diagnostic: null };
  const validation = validateConsumerContract(contractKey, value, accepted);
  if (!validation.ok) return rejected(contractKey, 'INVALID_CONTRACT', validation.errors.join(' '));
  const contractDataset = contractDatasetId(contractKey, value);
  if (datasetId && contractDataset && contractDataset !== datasetId) {
    return rejected(contractKey, 'DATASET_MISMATCH', `Expected dataset ${datasetId}; received ${contractDataset}.`);
  }
  const linkError = contractLinkError(contractKey, value, accepted);
  return linkError ? rejected(contractKey, 'STALE_CONTRACT_EVIDENCE', linkError) : { value, diagnostic: null };
}

function contractReference(contractKey, state) {
  const value = state.contracts[contractKey];
  const diagnostic = state.diagnostics.find((row) => row.contractKey === contractKey);
  const reference = {
    contractKey,
    schema: value?.schema || null,
    semanticHash: value?.semanticHash || null,
    datasetId: contractDatasetId(contractKey, value),
    availability: value ? 'AVAILABLE' : diagnostic ? 'INVALID' : 'UNAVAILABLE',
  };
  const qualification = qualificationSummary(value);
  return deepFreeze(qualification ? { ...reference, qualificationSummary: qualification } : reference);
}

function contextMetadata(input) {
  const datasetId = stringValue(input.datasetId) || null;
  const selectedEntityId = stringValue(input.selectedEntityId) || null;
  const workspaceVersion = Number.isInteger(input.workspaceVersion) && input.workspaceVersion >= 0
    ? input.workspaceVersion : 0;
  return { datasetId, workspaceVersion, selectedEntityId };
}

function qualificationSummary(value) {
  if (Array.isArray(value?.qualificationSummary)) return value.qualificationSummary;
  if (Array.isArray(value?.sections?.qualification)) return value.sections.qualification;
  return null;
}

function availability(references, diagnostics) {
  const availableContractKeys = references.filter((row) => row.availability === 'AVAILABLE').map((row) => row.contractKey);
  const invalidContractKeys = references.filter((row) => row.availability === 'INVALID').map((row) => row.contractKey);
  const unavailableContractKeys = references.filter((row) => row.availability === 'UNAVAILABLE').map((row) => row.contractKey);
  return deepFreeze({
    contractCount: references.length,
    availableContractKeys,
    invalidContractKeys,
    unavailableContractKeys,
    diagnosticCount: diagnostics.length,
  });
}

function rejected(contractKey, code, message) {
  return {
    value: null,
    diagnostic: deepFreeze({ code, severity: 'ERROR', contractKey, message }),
  };
}

function diagnosticOrder(left, right) {
  return `${left.contractKey}|${left.code}|${left.message}`.localeCompare(`${right.contractKey}|${right.code}|${right.message}`);
}

function contextHashPayload(value) {
  const {
    contracts: _contracts,
    semanticHash: _semanticHash,
    ...payload
  } = value || {};
  return payload;
}

function contextIdFor(value) {
  const { contextId: _contextId, ...identity } = contextHashPayload(value);
  return `workspace-consumer-context:${semanticHash(identity).split(':')[1]}`;
}
