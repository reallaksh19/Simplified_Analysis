import {
  canonicalStringify,
  deepFreeze,
  semanticHash,
} from '../shared-piping-model/index.js';
import {
  PIPE_SOLVER_DIAGNOSTIC_CODES,
  PIPE_SOLVER_LIMITATIONS,
  PIPE_SOLVER_REVIEW_MODEL_SCHEMA,
} from './constants.js';
import { validatePipeScreeningResult } from './source.js';
import { validatePipeSolverConsumerSource } from './source-validation.js';

export function createPipeSolverReviewModel(source) {
  assertSource(source);
  const resultState = currentResultEvidence(source.activeSession);
  const sourceReferences = buildSourceReferences(source, resultState.result);
  const selection = projectSelection(source.selectedEntity);
  const capabilitySummary = projectCapabilitySummary(source.capability);
  const inputRows = projectInputRows(source.capability, source.activeSession);
  const sessionSummary = projectSession(source.activeSession);
  const ledgerRows = source.matchingLedgerEntries.map((entry) => projectLedgerRow(entry, source.activeMatchingLedgerEntryId));
  const diagnostics = canonicalDiagnostics([
    ...source.diagnostics,
    ...resultState.diagnostics,
    ...failureDiagnostics(source.activeSession),
  ]);
  const identity = {
    schema: PIPE_SOLVER_REVIEW_MODEL_SCHEMA,
    datasetId: source.datasetId,
    contextSemanticHash: source.contextSemanticHash,
    sourceReferenceIdentity: referenceIdentity(source, resultState.result),
    selection,
    capabilitySummary,
    inputRows,
    sessionSummary,
    currentResult: resultState.result,
    ledgerRows,
    assumptions: source.capability.assumptions,
    limitations: combinedLimitations(source.capability.limitations),
    diagnostics,
    summary: buildSummary(source, resultState.result, ledgerRows, inputRows),
  };
  const reviewModelId = `pipe-solver-review-model:${semanticHash(identity).split(':')[1]}`;
  const hashPayload = { ...identity, reviewModelId };
  return deepFreeze({
    ...hashPayload,
    sourceSnapshot: source,
    sourceReferences,
    semanticHash: semanticHash(hashPayload),
  });
}

export function validatePipeSolverReviewModel(value) {
  const errors = [];
  if (value?.schema !== PIPE_SOLVER_REVIEW_MODEL_SCHEMA) errors.push('Invalid Pipe Solver review-model schema.');
  if (!value?.sourceSnapshot) errors.push('Pipe Solver review model source snapshot is required.');
  if (!errors.length) compareReconstructed(value, errors);
  return deepFreeze({ ok: errors.length === 0, errors });
}

function compareReconstructed(value, errors) {
  try {
    const expected = createPipeSolverReviewModel(value.sourceSnapshot);
    if (value.sourceSnapshot !== expected.sourceSnapshot) errors.push('Pipe Solver source snapshot reference mismatch.');
    compareSourceReferences(value.sourceReferences, expected.sourceReferences, errors);
    if (canonicalStringify(reviewPayload(value)) !== canonicalStringify(reviewPayload(expected))) {
      errors.push('Pipe Solver review model does not match exact source evidence.');
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
}

function compareSourceReferences(actual, expected, errors) {
  if (!actual || !expected) {
    errors.push('Pipe Solver source references are required.');
    return;
  }
  ['sourceContext', 'selectedSourceAttributes', 'selectedNativeParams', 'capabilityFields',
    'activeSession', 'currentResult', 'matchingLedgerEntries'].forEach((key) => {
    if (actual[key] !== expected[key]) errors.push(`Pipe Solver exact source reference mismatch: ${key}.`);
  });
  if (actual.sourceSemanticHash !== expected.sourceSemanticHash) errors.push('Pipe Solver source semantic-hash reference mismatch.');
}

function assertSource(source) {
  const validation = validatePipeSolverConsumerSource(source);
  if (!validation.ok) throw new TypeError(`Invalid Pipe Solver source: ${validation.errors.join(' ')}`);
}

function buildSourceReferences(source, result) {
  return deepFreeze({
    sourceSemanticHash: source.semanticHash,
    sourceContext: source.sourceContext,
    selectedSourceAttributes: source.selectedEntity?.sourceAttributes || null,
    selectedNativeParams: source.selectedEntity?.nativeParams || null,
    capabilityFields: source.capability.fields,
    activeSession: source.activeSession,
    currentResult: result,
    matchingLedgerEntries: source.matchingLedgerEntries,
  });
}

function referenceIdentity(source, result) {
  return deepFreeze({
    sourceSemanticHash: source.semanticHash,
    selectedEntityId: source.selectedEntityId,
    activeSessionId: source.activeSession?.sessionId || null,
    activeSessionVersion: source.activeSession?.version ?? null,
    currentResultHash: result ? semanticHash(result) : null,
    ledgerEntryIds: source.matchingLedgerEntries.map((entry) => entry.entryId),
    activeMatchingLedgerEntryId: source.activeMatchingLedgerEntryId,
  });
}

function projectSelection(entity) {
  return deepFreeze(entity ? {
    available: true,
    entityId: entity.entityId,
    entityType: entity.entityType,
    name: entity.name,
    lineIdentity: entity.lineIdentity,
    systemIdentity: entity.systemIdentity,
    sourcePath: entity.sourcePath,
  } : {
    available: false,
    entityId: null,
    entityType: null,
    name: null,
    lineIdentity: null,
    systemIdentity: null,
    sourcePath: null,
  });
}

function projectCapabilitySummary(capability) {
  return deepFreeze({
    analysisType: capability.analysisType,
    label: capability.label,
    description: capability.description,
    engineeringLevel: capability.engineeringLevel,
    solverId: capability.solverId,
    solverVersion: capability.solverVersion,
    methodId: capability.methodId,
    methodVersion: capability.methodVersion,
    applicable: capability.applicable,
    readyToReview: capability.readyToReview,
    readyToRun: capability.readyToRun,
    missingInputKeys: capability.missingInputs.map((row) => row.key),
  });
}

function projectInputRows(capability, session) {
  const fields = session?.inputs || capability.fields;
  const overrides = session?.overrides || {};
  const fieldErrors = session?.fieldErrors || {};
  return deepFreeze(fields.map((field) => deepFreeze({
    key: field.key,
    label: field.label,
    unit: field.unit,
    value: field.value,
    source: field.source,
    sourcePath: field.sourcePath,
    editable: field.editable,
    validation: field.validation,
    overrideValue: hasOwn(overrides, field.key) ? overrides[field.key] : null,
    fieldError: hasOwn(fieldErrors, field.key) ? fieldErrors[field.key] : null,
  })));
}

function projectSession(session) {
  if (!session) return deepFreeze({ available: false });
  return deepFreeze({
    available: true,
    sessionId: session.sessionId,
    version: session.version,
    status: session.status,
    analysisType: session.analysisType,
    datasetId: session.datasetId,
    workspaceVersion: session.workspaceVersion,
    targetId: session.targetId,
    requestId: session.requestId || null,
    fieldErrorCount: Object.keys(session.fieldErrors || {}).length,
    readiness: session.readiness,
    workspaceReadiness: session.workspaceReadiness,
    failure: session.status === 'failed' ? session.failure : null,
  });
}

function currentResultEvidence(session) {
  if (!session || session.status !== 'completed') return { result: null, diagnostics: [] };
  const validation = validatePipeScreeningResult(session.result);
  if (validation.ok) return { result: session.result, diagnostics: [] };
  return { result: null, diagnostics: [] };
}

function projectLedgerRow(entry, activeEntryId) {
  const session = entry.session;
  const validation = session.status === 'completed'
    ? validatePipeScreeningResult(session.result)
    : { ok: false };
  const result = validation.ok ? session.result : null;
  return deepFreeze({
    entryId: entry.entryId,
    sequence: entry.sequence,
    archiveKey: entry.archiveKey,
    datasetId: session.datasetId,
    sessionId: session.sessionId,
    targetId: session.targetId,
    status: session.status,
    requestId: session.requestId || null,
    engineeringLevel: result?.engineeringLevel || null,
    methodId: result?.methodId || null,
    resultStatus: result?.status || null,
    warningCount: result?.warnings?.length || 0,
    diagnosticCount: result?.diagnostics?.length || 0,
    failureCode: session.failure?.code || null,
    failureMessage: session.failure?.message || null,
    resultAccepted: validation.ok,
    active: entry.entryId === activeEntryId,
  });
}

function failureDiagnostics(session) {
  if (session?.status !== 'failed' || !session.failure) return [];
  return [diagnostic(
    PIPE_SOLVER_DIAGNOSTIC_CODES.SESSION_FAILED,
    'ERROR', 'SESSION', session.failure.message || 'Pipe Solver execution failed.',
    { sessionId: session.sessionId, code: session.failure.code || null },
  )];
}

function combinedLimitations(capabilityLimitations) {
  return deepFreeze([...new Set([...(capabilityLimitations || []), ...PIPE_SOLVER_LIMITATIONS])]);
}

function buildSummary(source, result, ledgerRows, inputRows) {
  return deepFreeze({
    selectionAvailable: Boolean(source.selectedEntity),
    applicable: source.capability.applicable,
    readyToReview: source.capability.readyToReview,
    readyToRun: source.capability.readyToRun,
    activeSessionAvailable: Boolean(source.activeSession),
    currentResultAvailable: Boolean(result),
    inputCount: inputRows.length,
    missingInputCount: source.capability.missingInputs.length,
    fieldErrorCount: source.activeSession ? Object.keys(source.activeSession.fieldErrors || {}).length : 0,
    matchingLedgerEntryCount: ledgerRows.length,
    activeMatchingLedgerEntryId: source.activeMatchingLedgerEntryId,
  });
}

function canonicalDiagnostics(rows) {
  const byKey = new Map();
  rows.forEach((row) => byKey.set(diagnosticKey(row), row));
  return deepFreeze([...byKey.values()].sort((a, b) => diagnosticKey(a).localeCompare(diagnosticKey(b))));
}

function diagnostic(code, severity, scope, message, data = {}) {
  return deepFreeze({ code, severity, scope, message, data });
}

function diagnosticKey(row) {
  return `${row?.scope || ''}\0${row?.code || ''}\0${row?.severity || ''}\0${row?.message || ''}\0${canonicalStringify(row?.data || {})}`;
}

function reviewPayload(value) {
  if (!value || typeof value !== 'object') return value;
  const { sourceSnapshot: _source, sourceReferences: _references, ...payload } = value;
  return payload;
}

function hasOwn(value, key) {
  return Boolean(value) && Object.prototype.hasOwnProperty.call(value, key);
}
