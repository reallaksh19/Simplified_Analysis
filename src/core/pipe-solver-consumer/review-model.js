import { canonicalStringify, deepFreeze, semanticHash } from '../shared-piping-model/index.js';
import {
  PIPE_SCREENING_ENGINEERING_LEVEL,
  PIPE_SCREENING_METHOD_ID,
  PIPE_SCREENING_RESULT_SCHEMA,
  PIPE_SOLVER_DIAGNOSTIC_CODES,
  PIPE_SOLVER_REVIEW_MODEL_SCHEMA,
  PIPE_SOLVER_VIEW_LIMITATIONS,
} from './constants.js';
import { validatePipeSolverConsumerSource } from './source.js';

export function createPipeSolverReviewModel(sourceSnapshot) {
  assertSource(sourceSnapshot);
  const diagnostics = [...sourceSnapshot.diagnostics];
  const currentResult = projectCurrentResult(sourceSnapshot.activeSession, diagnostics);
  const inputRows = projectInputRows(sourceSnapshot);
  const ledgerRows = projectLedgerRows(sourceSnapshot.matchingLedgerEntries);
  const identity = {
    schema: PIPE_SOLVER_REVIEW_MODEL_SCHEMA,
    datasetId: sourceSnapshot.datasetId,
    contextSemanticHash: sourceSnapshot.contextSemanticHash,
    sourceReferences: sourceReferences(sourceSnapshot, currentResult),
    selection: projectSelection(sourceSnapshot.selectedEntity),
    capabilitySummary: projectCapability(sourceSnapshot.capability),
    inputRows,
    sessionSummary: projectSession(sourceSnapshot.activeSession),
    currentResult,
    ledgerRows,
    assumptions: sourceSnapshot.capability.assumptions,
    limitations: deepFreeze([...sourceSnapshot.capability.limitations, ...PIPE_SOLVER_VIEW_LIMITATIONS]),
    diagnostics: canonicalDiagnostics(diagnostics),
    summary: summary(sourceSnapshot, currentResult, inputRows, ledgerRows),
  };
  const reviewModelId = `pipe-solver-review-model:${semanticHash(reviewIdentity(identity)).split(':')[1]}`;
  const payload = { ...identity, reviewModelId };
  return deepFreeze({ ...payload, sourceSnapshot, semanticHash: semanticHash(reviewIdentity(payload)) });
}

export function validatePipeSolverReviewModel(value) {
  const errors = [];
  if (value?.schema !== PIPE_SOLVER_REVIEW_MODEL_SCHEMA) errors.push('Invalid Pipe Solver review-model schema.');
  if (!value?.sourceSnapshot) errors.push('Pipe Solver review model requires its exact source snapshot.');
  if (!errors.length && !validatePipeSolverConsumerSource(value.sourceSnapshot).ok) errors.push('Pipe Solver review source is invalid.');
  if (!errors.length) compareReconstructed(value, errors);
  return deepFreeze({ ok: errors.length === 0, errors });
}

function compareReconstructed(value, errors) {
  try {
    const expected = createPipeSolverReviewModel(value.sourceSnapshot);
    if (value.sourceSnapshot !== expected.sourceSnapshot) errors.push('Pipe Solver source-snapshot reference mismatch.');
    if (value.semanticHash !== expected.semanticHash) errors.push('Pipe Solver review-model semantic hash mismatch.');
    if (canonicalStringify(contractPayload(value)) !== canonicalStringify(contractPayload(expected))) {
      errors.push('Pipe Solver review model does not match reconstructed source evidence.');
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
}

function projectInputRows(source) {
  const session = source.activeSession;
  const fields = session?.inputs || source.capability.inputFields || [];
  return deepFreeze([...fields].sort((a, b) => a.key.localeCompare(b.key)).map((field) => deepFreeze({
    key: field.key,
    label: field.label,
    unit: field.unit,
    value: field.value,
    source: field.source,
    sourcePath: field.sourcePath,
    editable: field.editable,
    validation: field.validation,
    overrideValue: session && Object.prototype.hasOwnProperty.call(session.overrides || {}, field.key)
      ? session.overrides[field.key] : null,
    fieldError: session?.fieldErrors?.[field.key] || '',
    sourceField: field,
  })));
}

function projectCurrentResult(session, diagnostics) {
  if (!session || session.status !== 'completed' || !session.result) return null;
  const result = session.result;
  if (!validResult(result)) {
    diagnostics.push({
      severity: 'ERROR',
      code: PIPE_SOLVER_DIAGNOSTIC_CODES.RESULT_INVALID,
      message: 'The completed Pipe Solver session contains an invalid or unexpected solver-result contract.',
      details: {},
    });
    return null;
  }
  return result;
}

function validResult(result) {
  return result?.schemaVersion === PIPE_SCREENING_RESULT_SCHEMA
    && result.engineeringLevel === PIPE_SCREENING_ENGINEERING_LEVEL
    && result.methodId === PIPE_SCREENING_METHOD_ID
    && Array.isArray(result.formulaIds)
    && Array.isArray(result.diagnostics)
    && Array.isArray(result.warnings)
    && Array.isArray(result.formulaTrace)
    && typeof result.results === 'object';
}

function projectSelection(entity) {
  if (!entity) return null;
  return deepFreeze({
    entityId: entity.entityId,
    entityType: entity.entityType,
    name: entity.name,
    lineIdentity: entity.lineIdentity,
    systemIdentity: entity.systemIdentity,
    sourcePath: entity.sourcePath,
    sourceAttributes: entity.sourceAttributes,
    nativeParams: entity.nativeParams,
    sourceEntity: entity,
  });
}

function projectCapability(capability) {
  return deepFreeze({
    analysisType: capability.analysisType,
    label: capability.label,
    description: capability.description,
    engineeringLevel: capability.engineeringLevel,
    solverId: capability.solverId,
    solverVersion: capability.solverVersion,
    methodId: capability.methodId,
    methodVersion: capability.methodVersion,
    codeBasis: capability.codeBasis,
    applicable: capability.applicable,
    readyToReview: capability.readyToReview,
    readyToRun: capability.readyToRun,
    missingInputs: capability.missingInputs,
    diagnostics: capability.diagnostics,
    sourceCapability: capability,
  });
}

function projectSession(session) {
  if (!session) return null;
  return deepFreeze({
    sessionId: session.sessionId,
    analysisType: session.analysisType,
    targetId: session.targetId,
    datasetId: session.datasetId,
    workspaceVersion: session.workspaceVersion,
    version: session.version,
    status: session.status,
    inputs: deepFreeze([...(session.inputs || [])].sort((a, b) => a.key.localeCompare(b.key))),
    overrides: session.overrides,
    fieldErrors: session.fieldErrors,
    readiness: session.readiness,
    workspaceReadiness: session.workspaceReadiness,
    requestId: session.requestId || null,
    failure: session.failure,
    sourceSession: session,
  });
}

function projectLedgerRows(entries) {
  return deepFreeze(entries.map((entry) => {
    const session = entry.session;
    const result = session.result;
    return deepFreeze({
      entryId: entry.entryId,
      sequence: entry.sequence,
      archiveKey: entry.archiveKey,
      datasetId: entry.datasetId,
      sessionId: session.sessionId,
      targetId: session.targetId,
      status: session.status,
      requestId: session.requestId || null,
      engineeringLevel: result?.engineeringLevel || null,
      methodId: result?.methodId || null,
      resultStatus: result?.status || null,
      warningCount: Array.isArray(result?.warnings) ? result.warnings.length : 0,
      diagnosticCount: Array.isArray(result?.diagnostics) ? result.diagnostics.length : 0,
      failureCode: session.failure?.code || null,
      failureMessage: session.failure?.message || null,
      sourceEntry: entry,
    });
  }));
}

function sourceReferences(source, result) {
  return deepFreeze({
    sourceSemanticHash: source.semanticHash,
    contextSemanticHash: source.contextSemanticHash,
    selectedEntityId: source.selectedEntityId,
    activeSessionId: source.activeSession?.sessionId || null,
    currentResult: result,
    ledgerEntryIds: source.matchingLedgerEntries.map((entry) => entry.entryId),
  });
}

function summary(source, result, inputs, ledger) {
  return deepFreeze({
    datasetAvailable: Boolean(source.datasetId),
    selectionAvailable: Boolean(source.selectedEntity),
    applicable: source.capability.applicable,
    readyToReview: source.capability.readyToReview,
    readyToRun: source.capability.readyToRun,
    activeSessionStatus: source.activeSession?.status || null,
    inputCount: inputs.length,
    missingInputCount: source.capability.missingInputs.length,
    fieldErrorCount: Object.keys(source.activeSession?.fieldErrors || {}).length,
    currentResultAvailable: Boolean(result),
    ledgerEntryCount: ledger.length,
    activeMatchingLedgerEntryId: source.activeMatchingLedgerEntryId,
  });
}

function canonicalDiagnostics(rows) {
  return deepFreeze([...rows].sort((a, b) => `${a.code}|${a.message}`.localeCompare(`${b.code}|${b.message}`)));
}

function assertSource(source) {
  const validation = validatePipeSolverConsumerSource(source);
  if (!validation.ok) throw new TypeError(`Invalid Pipe Solver consumer source: ${validation.errors.join(' ')}`);
}

function reviewIdentity(value) {
  return {
    ...value,
    selection: omit(value.selection, 'sourceEntity'),
    capabilitySummary: omit(value.capabilitySummary, 'sourceCapability'),
    inputRows: (value.inputRows || []).map((row) => omit(row, 'sourceField')),
    sessionSummary: omit(value.sessionSummary, 'sourceSession'),
    ledgerRows: (value.ledgerRows || []).map((row) => omit(row, 'sourceEntry')),
  };
}

function omit(value, key) {
  if (!value) return value;
  const { [key]: _omitted, ...retained } = value;
  return retained;
}

function contractPayload(value) {
  const { sourceSnapshot: _source, semanticHash: _hash, ...payload } = value || {};
  return payload;
}
