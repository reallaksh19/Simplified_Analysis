import {
  canonicalStringify,
  deepFreeze,
  semanticHash,
} from '../shared-piping-model/index.js';
import { validateSolverResultContract } from '../solvers/certification/solverResultContract.js';
import { validateWorkspaceConsumerContext } from '../workspace-consumers/index.js';
import {
  PIPE_SCREENING_ANALYSIS_TYPE,
  PIPE_SCREENING_ENGINEERING_LEVEL,
  PIPE_SCREENING_METHOD_ID,
  PIPE_SCREENING_RESULT_SCHEMA,
  PIPE_SOLVER_DIAGNOSTIC_CODES,
  PIPE_SOLVER_SOURCE_SCHEMA,
} from './constants.js';
import { freezeEvidenceGraph } from './freeze-evidence.js';
import { buildPipeSolverSourceIdentity } from './source-identity.js';

export function createPipeSolverConsumerSource(input = {}) {
  const sourceContext = requireSourceContext(input.sourceContext);
  const metadata = sourceMetadata(sourceContext);
  const selectedEntity = projectSelectedEntity(input.selectedEntity, metadata.selectedEntityId);
  const capability = projectCapability(input.capabilityInspection, selectedEntity);
  const sessionState = retainSession(input.sessionSnapshot?.session || null, metadata);
  const ledgerState = retainLedger(input.ledgerSnapshot, metadata);
  const resultDiagnostics = resultEvidenceDiagnostics(sessionState.activeSession, ledgerState.entries);
  const diagnostics = canonicalDiagnostics([
    ...selectionDiagnostics(selectedEntity),
    ...sessionState.diagnostics,
    ...ledgerState.diagnostics,
    ...resultDiagnostics,
  ]);
  const identity = {
    schema: PIPE_SOLVER_SOURCE_SCHEMA,
    ...metadata,
    selectedEntity,
    capability,
    activeSession: sessionState.activeSession,
    matchingLedgerEntries: ledgerState.entries,
    activeMatchingLedgerEntryId: ledgerState.activeEntryId,
    diagnostics,
  };
  return freezeEvidenceGraph({
    ...identity,
    sourceContext,
    semanticHash: semanticHash(pipeSolverSourceIdentity(identity)),
  });
}

export function isMatchingPipeSolverSession(session, metadata) {
  return Boolean(session
    && session.schema === 'analysis-session/v1'
    && session.analysisType === PIPE_SCREENING_ANALYSIS_TYPE
    && session.datasetId === metadata.datasetId
    && session.targetId === metadata.selectedEntityId
    && session.workspaceVersion === metadata.workspaceVersion);
}

export function validatePipeScreeningResult(result) {
  const validation = validateSolverResultContract(result);
  const errors = [...validation.errors];
  if (result?.schemaVersion !== PIPE_SCREENING_RESULT_SCHEMA) errors.push('Unexpected Pipe Solver result schema.');
  if (result?.engineeringLevel !== PIPE_SCREENING_ENGINEERING_LEVEL) errors.push('Unexpected Pipe Solver engineering level.');
  if (result?.methodId !== PIPE_SCREENING_METHOD_ID) errors.push('Unexpected Pipe Solver method.');
  if (result && Object.prototype.hasOwnProperty.call(result, 'semanticHash')) {
    const { semanticHash: declared, ...payload } = result;
    if (declared !== semanticHash(payload)) errors.push('Pipe Solver result semantic hash mismatch.');
  }
  return deepFreeze({ ok: errors.length === 0, errors });
}

function requireSourceContext(value) {
  const validation = validateWorkspaceConsumerContext(value);
  if (!validation.ok) throw new TypeError(`Invalid workspace consumer context: ${validation.errors.join(' ')}`);
  if (!value.datasetId) throw new TypeError('Pipe Solver source requires an active dataset context.');
  return value;
}

function sourceMetadata(context) {
  return {
    datasetId: context.datasetId,
    workspaceVersion: context.workspaceVersion,
    selectedEntityId: context.selectedEntityId,
    contextSemanticHash: context.semanticHash,
  };
}

function projectSelectedEntity(entity, selectedEntityId) {
  if (!selectedEntityId || !entity) return null;
  if (entity.entityId !== selectedEntityId) throw new TypeError('Selected entity does not match the consumer context.');
  return deepFreeze({
    entityId: entity.entityId,
    entityType: entity.entityType,
    name: entity.name,
    lineIdentity: entity.lineId || null,
    systemIdentity: entity.systemId || null,
    sourcePath: entity.sourcePath || null,
    sourceAttributes: entity.properties?.sourceAttributes || null,
    nativeParams: entity.properties?.nativeParams || null,
  });
}

function projectCapability(inspection, selectedEntity) {
  if (!inspection) return unavailableCapability(selectedEntity ? 'Inspection is unavailable.' : 'No entity is selected.');
  const readiness = inspection.workspaceReadiness;
  if (!readiness || readiness.analysisType !== PIPE_SCREENING_ANALYSIS_TYPE) {
    throw new TypeError('Pipe Solver source requires pipe-screening inspection evidence.');
  }
  return deepFreeze({
    analysisType: readiness.analysisType,
    label: readiness.label,
    description: readiness.description,
    engineeringLevel: readiness.engineeringLevel,
    solverId: readiness.solverId,
    solverVersion: readiness.solverVersion,
    methodId: readiness.methodId,
    methodVersion: readiness.methodVersion,
    applicable: readiness.applicable,
    readyToReview: readiness.readyToReview,
    readyToRun: readiness.readyToRun,
    fields: inspection.fields,
    missingInputs: readiness.missingInputs,
    diagnostics: canonicalDiagnostics(readiness.diagnostics),
    assumptions: readiness.assumptions,
    limitations: readiness.limitations,
  });
}

function unavailableCapability(message) {
  return deepFreeze({
    analysisType: PIPE_SCREENING_ANALYSIS_TYPE,
    label: null,
    description: null,
    engineeringLevel: null,
    solverId: null,
    solverVersion: null,
    methodId: null,
    methodVersion: null,
    applicable: false,
    readyToReview: false,
    readyToRun: false,
    fields: deepFreeze([]),
    missingInputs: deepFreeze([]),
    diagnostics: canonicalDiagnostics([diagnostic(
      PIPE_SOLVER_DIAGNOSTIC_CODES.INSPECTION_UNAVAILABLE,
      'INFO', 'CAPABILITY', message,
    )]),
    assumptions: deepFreeze([]),
    limitations: deepFreeze([]),
  });
}

function retainSession(session, metadata) {
  if (!session) return { activeSession: null, diagnostics: [] };
  const mismatches = sessionMismatches(session, metadata);
  if (!mismatches.length) return { activeSession: session, diagnostics: [] };
  return { activeSession: null, diagnostics: mismatches };
}

function sessionMismatches(session, metadata) {
  const rows = [];
  if (session.analysisType !== PIPE_SCREENING_ANALYSIS_TYPE) rows.push(sessionDiagnostic(PIPE_SOLVER_DIAGNOSTIC_CODES.SESSION_ANALYSIS_MISMATCH, 'Active session belongs to another capability.', session));
  if (session.datasetId !== metadata.datasetId) rows.push(sessionDiagnostic(PIPE_SOLVER_DIAGNOSTIC_CODES.SESSION_DATASET_MISMATCH, 'Active session belongs to another dataset.', session));
  if (session.targetId !== metadata.selectedEntityId) rows.push(sessionDiagnostic(PIPE_SOLVER_DIAGNOSTIC_CODES.SESSION_TARGET_MISMATCH, 'Active session target does not match the selected entity.', session));
  if (session.workspaceVersion !== metadata.workspaceVersion) rows.push(sessionDiagnostic(PIPE_SOLVER_DIAGNOSTIC_CODES.SESSION_CONTEXT_STALE, 'Active session workspace version is stale.', session));
  return rows;
}

function retainLedger(snapshot, metadata) {
  const entries = [], diagnostics = [];
  for (const entry of snapshot?.entries || []) {
    const reason = ledgerExclusion(entry, metadata);
    if (reason) diagnostics.push(reason);
    else entries.push(entry);
  }
  entries.sort(compareLedgerEntries);
  diagnostics.push(...duplicateSequenceDiagnostics(entries));
  const ids = new Set(entries.map((entry) => entry.entryId));
  const sourceActive = snapshot?.activeEntryId || '';
  const activeEntryId = ids.has(sourceActive) ? sourceActive : null;
  if (sourceActive && !activeEntryId) diagnostics.push(diagnostic(
    PIPE_SOLVER_DIAGNOSTIC_CODES.ACTIVE_LEDGER_FILTERED,
    'INFO', 'LEDGER', 'The active ledger entry is outside current Pipe Solver evidence.',
    { entryId: sourceActive },
  ));
  return { entries: deepFreeze(entries), activeEntryId, diagnostics };
}

function ledgerExclusion(entry, metadata) {
  if (entry?.schema !== 'analysis-ledger-entry/v1' || !entry.session) return diagnostic(
    PIPE_SOLVER_DIAGNOSTIC_CODES.LEDGER_ENTRY_INVALID, 'ERROR', 'LEDGER',
    'A malformed analysis ledger entry was excluded.', { entryId: entry?.entryId || null },
  );
  if (entry.session.analysisType !== PIPE_SCREENING_ANALYSIS_TYPE) return diagnostic(
    PIPE_SOLVER_DIAGNOSTIC_CODES.LEDGER_ANALYSIS_FILTERED, 'INFO', 'LEDGER',
    'A non-pipe-screening ledger entry was excluded.', { entryId: entry.entryId },
  );
  if (entry.session.datasetId !== metadata.datasetId) return diagnostic(
    PIPE_SOLVER_DIAGNOSTIC_CODES.LEDGER_DATASET_FILTERED, 'INFO', 'LEDGER',
    'A ledger entry from another dataset was excluded.', { entryId: entry.entryId },
  );
  return null;
}

function duplicateSequenceDiagnostics(entries) {
  const counts = new Map();
  entries.forEach((entry) => counts.set(entry.sequence, (counts.get(entry.sequence) || 0) + 1));
  return [...counts.entries()].filter(([, count]) => count > 1).map(([sequence, count]) => diagnostic(
    PIPE_SOLVER_DIAGNOSTIC_CODES.LEDGER_DUPLICATE_SEQUENCE,
    'WARNING', 'LEDGER', 'Multiple matching ledger entries share one sequence.',
    { sequence, count },
  ));
}

function resultEvidenceDiagnostics(activeSession, entries) {
  const rows = [];
  if (activeSession?.status === 'completed') appendResultDiagnostic(rows, activeSession.result, false, activeSession.sessionId);
  entries.forEach((entry) => {
    if (entry.session?.status === 'completed') appendResultDiagnostic(rows, entry.session.result, true, entry.entryId);
  });
  return rows;
}

function appendResultDiagnostic(rows, result, ledger, identity) {
  const validation = validatePipeScreeningResult(result);
  if (validation.ok) return;
  rows.push(diagnostic(
    ledger ? PIPE_SOLVER_DIAGNOSTIC_CODES.LEDGER_RESULT_INVALID : PIPE_SOLVER_DIAGNOSTIC_CODES.CURRENT_RESULT_INVALID,
    'ERROR', ledger ? 'LEDGER_RESULT' : 'CURRENT_RESULT',
    'Pipe Solver result evidence failed contract validation.',
    { identity, errors: validation.errors },
  ));
}

function selectionDiagnostics(selectedEntity) {
  return selectedEntity ? [] : [diagnostic(
    PIPE_SOLVER_DIAGNOSTIC_CODES.NO_SELECTION,
    'INFO', 'SELECTION', 'Select a Workspace entity to inspect Pipe Solver applicability.',
  )];
}

function sessionDiagnostic(code, message, session) {
  return diagnostic(code, 'WARNING', 'SESSION', message, {
    sessionId: session.sessionId || null,
    analysisType: session.analysisType || null,
    datasetId: session.datasetId || null,
    targetId: session.targetId || null,
  });
}

function diagnostic(code, severity, scope, message, data = {}) {
  return deepFreeze({ code, severity, scope, message, data });
}

function canonicalDiagnostics(rows) {
  return deepFreeze([...rows].sort((left, right) => diagnosticKey(left).localeCompare(diagnosticKey(right))));
}

function diagnosticKey(row) {
  return `${row?.scope || ''}\0${row?.code || ''}\0${row?.severity || ''}\0${row?.message || ''}\0${canonicalStringify(row?.data || {})}`;
}

function compareLedgerEntries(left, right) {
  return left.sequence - right.sequence || String(left.entryId).localeCompare(String(right.entryId));
}

export function pipeSolverSourceIdentity(value) {
  return buildPipeSolverSourceIdentity(value);
}

export function comparePipeSolverLedgerEntries(left, right) {
  return compareLedgerEntries(left, right);
}

export function canonicalPipeSolverDiagnostics(rows) {
  return canonicalDiagnostics(rows);
}
