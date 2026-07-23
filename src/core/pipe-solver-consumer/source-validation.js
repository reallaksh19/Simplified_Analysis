import { canonicalStringify, deepFreeze, semanticHash } from '../shared-piping-model/index.js';
import { validateWorkspaceConsumerContext } from '../workspace-consumers/index.js';
import { PIPE_SCREENING_ANALYSIS_TYPE, PIPE_SOLVER_SOURCE_SCHEMA } from './constants.js';
import {
  canonicalPipeSolverDiagnostics,
  comparePipeSolverLedgerEntries,
  isMatchingPipeSolverSession,
  pipeSolverSourceIdentity,
} from './source.js';

const SOURCE_KEYS = Object.freeze([
  'activeMatchingLedgerEntryId', 'activeSession', 'capability', 'contextSemanticHash',
  'datasetId', 'diagnostics', 'matchingLedgerEntries', 'schema', 'selectedEntity',
  'selectedEntityId', 'semanticHash', 'sourceContext', 'workspaceVersion',
]);

export function validatePipeSolverConsumerSource(value) {
  const errors = [];
  validateExactKeys(value, SOURCE_KEYS, 'Pipe Solver source', errors);
  if (value?.schema !== PIPE_SOLVER_SOURCE_SCHEMA) errors.push('Invalid Pipe Solver source schema.');
  const contextValidation = validateWorkspaceConsumerContext(value?.sourceContext);
  if (!contextValidation.ok) errors.push(`Invalid Pipe Solver source context: ${contextValidation.errors.join(' ')}`);
  validateSourceMetadata(value, errors);
  validateSelectedEntity(value?.selectedEntity, value?.selectedEntityId, errors);
  validateCapability(value?.capability, errors);
  validateRetainedSession(value, errors);
  validateRetainedLedger(value, errors);
  validateDiagnostics(value?.diagnostics, errors);
  if (!errors.length && value.semanticHash !== semanticHash(pipeSolverSourceIdentity(value))) {
    errors.push('Pipe Solver source semantic hash mismatch.');
  }
  return deepFreeze({ ok: errors.length === 0, errors });
}

function validateSourceMetadata(value, errors) {
  const context = value?.sourceContext;
  if (value?.datasetId !== context?.datasetId) errors.push('Pipe Solver source datasetId mismatch.');
  if (value?.workspaceVersion !== context?.workspaceVersion) errors.push('Pipe Solver source workspaceVersion mismatch.');
  if (value?.selectedEntityId !== context?.selectedEntityId) errors.push('Pipe Solver source selectedEntityId mismatch.');
  if (value?.contextSemanticHash !== context?.semanticHash) errors.push('Pipe Solver source context semantic hash mismatch.');
}

function validateSelectedEntity(entity, selectedEntityId, errors) {
  if (!selectedEntityId && entity !== null) errors.push('Pipe Solver source selection must be null without a selected entity ID.');
  if (selectedEntityId && entity?.entityId !== selectedEntityId) errors.push('Pipe Solver source selected entity mismatch.');
  if (!entity) return;
  validateExactKeys(entity, [
    'entityId', 'entityType', 'lineIdentity', 'name', 'nativeParams',
    'sourceAttributes', 'sourcePath', 'systemIdentity',
  ], 'Pipe Solver selected entity', errors);
}

function validateCapability(capability, errors) {
  validateExactKeys(capability, [
    'analysisType', 'applicable', 'assumptions', 'description', 'diagnostics',
    'engineeringLevel', 'fields', 'label', 'limitations', 'methodId', 'methodVersion',
    'missingInputs', 'readyToReview', 'readyToRun', 'solverId', 'solverVersion',
  ], 'Pipe Solver capability', errors);
  if (capability?.analysisType !== PIPE_SCREENING_ANALYSIS_TYPE) errors.push('Pipe Solver capability analysis type mismatch.');
  const flags = ['applicable', 'readyToReview', 'readyToRun'];
  if (flags.some((key) => typeof capability?.[key] !== 'boolean')) errors.push('Pipe Solver capability readiness flags are invalid.');
  ['fields', 'missingInputs', 'diagnostics', 'assumptions', 'limitations'].forEach((key) => {
    if (!Array.isArray(capability?.[key])) errors.push(`Pipe Solver capability ${key} is invalid.`);
  });
}

function validateRetainedSession(value, errors) {
  if (value?.activeSession && !isMatchingPipeSolverSession(value.activeSession, value)) {
    errors.push('Pipe Solver active session does not match current source identity.');
  }
}

function validateRetainedLedger(value, errors) {
  const entries = value?.matchingLedgerEntries;
  if (!Array.isArray(entries)) {
    errors.push('Pipe Solver matching ledger entries are invalid.');
    return;
  }
  entries.forEach((entry) => validateLedgerEntry(entry, value, errors));
  const ordered = [...entries].sort(comparePipeSolverLedgerEntries);
  if (canonicalStringify(entries) !== canonicalStringify(ordered)) {
    errors.push('Pipe Solver matching ledger entries are not canonically ordered.');
  }
  const ids = new Set(entries.map((entry) => entry.entryId));
  if (value.activeMatchingLedgerEntryId !== null && !ids.has(value.activeMatchingLedgerEntryId)) {
    errors.push('Pipe Solver active matching ledger entry is invalid.');
  }
}

function validateLedgerEntry(entry, value, errors) {
  if (entry?.schema !== 'analysis-ledger-entry/v1' || !entry.session) {
    errors.push(`Pipe Solver retained ledger entry is malformed: ${entry?.entryId || 'unknown'}.`);
    return;
  }
  if (entry.session.analysisType !== PIPE_SCREENING_ANALYSIS_TYPE) {
    errors.push(`Pipe Solver retained ledger entry has another analysis type: ${entry.entryId}.`);
  }
  if (entry.session.datasetId !== value.datasetId) {
    errors.push(`Pipe Solver retained ledger entry has another dataset: ${entry.entryId}.`);
  }
}

function validateDiagnostics(rows, errors) {
  if (!Array.isArray(rows)) {
    errors.push('Pipe Solver source diagnostics are invalid.');
    return;
  }
  if (canonicalStringify(rows) !== canonicalStringify(canonicalPipeSolverDiagnostics(rows))) {
    errors.push('Pipe Solver source diagnostics are not canonical.');
  }
  rows.forEach((row) => {
    if (!row || typeof row.code !== 'string' || typeof row.message !== 'string' || typeof row.scope !== 'string') {
      errors.push('Pipe Solver source diagnostic is malformed.');
    }
  });
}

function validateExactKeys(value, expectedKeys, label, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${label} must be an object.`);
    return;
  }
  const actual = Object.keys(value).sort();
  if (canonicalStringify(actual) !== canonicalStringify([...expectedKeys].sort())) {
    errors.push(`${label} fields are not exact.`);
  }
}
