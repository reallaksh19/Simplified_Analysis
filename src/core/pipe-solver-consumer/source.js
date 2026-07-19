import { canonicalStringify, deepFreeze, semanticHash } from '../shared-piping-model/index.js';
import { validateWorkspaceConsumerContext } from '../workspace-consumers/index.js';
import {
  PIPE_SCREENING_ANALYSIS_TYPE,
  PIPE_SCREENING_MANIFEST,
  PIPE_SOLVER_CONSUMER_SOURCE_SCHEMA,
  PIPE_SOLVER_DIAGNOSTIC_CODES,
} from './constants.js';

export function createPipeSolverConsumerSource(input = {}) {
  const sourceContext = requireContext(input.sourceContext);
  const datasetId = sourceContext.datasetId;
  const selectedEntity = projectSelectedEntity(input.selectedEntity, sourceContext.selectedEntityId);
  const capability = projectCapability(input.capabilityInspection, selectedEntity, datasetId);
  const diagnostics = [...(input.diagnostics || [])];
  const activeSession = matchingSession(input.activeSession, datasetId, selectedEntity?.entityId, diagnostics);
  const ledger = matchingLedger(input.ledgerSnapshot, datasetId, diagnostics);
  const payload = {
    schema: PIPE_SOLVER_CONSUMER_SOURCE_SCHEMA,
    datasetId,
    workspaceVersion: sourceContext.workspaceVersion,
    selectedEntityId: selectedEntity?.entityId || null,
    contextSemanticHash: sourceContext.semanticHash,
    sourceContext,
    selectedEntity,
    capability,
    activeSession,
    matchingLedgerEntries: ledger.entries,
    activeMatchingLedgerEntryId: ledger.activeEntryId,
    diagnostics: canonicalDiagnostics(baseDiagnostics(datasetId, selectedEntity, diagnostics)),
  };
  return deepFreeze({ ...payload, semanticHash: semanticHash(sourceIdentity(payload)) });
}

export function validatePipeSolverConsumerSource(value) {
  const errors = [];
  if (value?.schema !== PIPE_SOLVER_CONSUMER_SOURCE_SCHEMA) errors.push('Invalid Pipe Solver consumer-source schema.');
  const contextValidation = validateWorkspaceConsumerContext(value?.sourceContext);
  if (!contextValidation.ok) errors.push(`Invalid source workspace-consumer context: ${contextValidation.errors.join(' ')}`);
  if (!errors.length) validateConsistency(value, errors);
  if (!errors.length) compareReconstructed(value, errors);
  return deepFreeze({ ok: errors.length === 0, errors });
}

function validateConsistency(value, errors) {
  if (value.datasetId !== value.sourceContext.datasetId) errors.push('Pipe Solver source dataset does not match its context.');
  if (value.workspaceVersion !== value.sourceContext.workspaceVersion) errors.push('Pipe Solver source workspace version mismatch.');
  if (value.contextSemanticHash !== value.sourceContext.semanticHash) errors.push('Pipe Solver source context hash mismatch.');
  if ((value.selectedEntity?.entityId || null) !== value.selectedEntityId) errors.push('Selected-entity identity mismatch.');
  if (value.selectedEntityId !== value.sourceContext.selectedEntityId) errors.push('Selected entity does not match the workspace-consumer context.');
  validateCapability(value.capability, value.selectedEntity, value.datasetId, errors);
  validateSession(value.activeSession, value, errors);
  validateLedger(value, errors);
  if (semanticHash(sourceIdentity(contractPayload(value))) !== value.semanticHash) errors.push('Pipe Solver source semantic hash mismatch.');
}

function compareReconstructed(value, errors) {
  try {
    const expected = createPipeSolverConsumerSource({
      sourceContext: value.sourceContext,
      selectedEntity: value.selectedEntity,
      capabilityInspection: value.capability?.sourceInspection || null,
      activeSession: value.activeSession,
      ledgerSnapshot: {
        datasetId: value.datasetId || '',
        entries: value.matchingLedgerEntries,
        activeEntryId: value.activeMatchingLedgerEntryId || '',
      },
      diagnostics: retainedAdapterDiagnostics(value.diagnostics),
    });
    if (value.sourceContext !== expected.sourceContext) errors.push('Pipe Solver source context reference mismatch.');
    if (canonicalStringify(contractPayload(value)) !== canonicalStringify(contractPayload(expected))) {
      errors.push('Pipe Solver consumer source does not match reconstructed evidence.');
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
}

function requireContext(context) {
  const validation = validateWorkspaceConsumerContext(context);
  if (!validation.ok) throw new TypeError(`Invalid workspace consumer context: ${validation.errors.join(' ')}`);
  return context;
}

function projectSelectedEntity(entity, expectedId) {
  if (!entity || !expectedId) return null;
  const properties = entity.properties || {};
  const projected = {
    entityId: entity.entityId,
    entityType: entity.entityType,
    name: entity.name,
    lineIdentity: entity.lineIdentity ?? entity.lineId ?? null,
    systemIdentity: entity.systemIdentity ?? entity.systemId ?? null,
    sourcePath: entity.sourcePath,
    sourceAttributes: entity.sourceAttributes ?? properties.sourceAttributes ?? null,
    nativeParams: entity.nativeParams ?? properties.nativeParams ?? null,
  };
  return deepFreeze(projected);
}

function projectCapability(inspection, selectedEntity, datasetId) {
  if (!inspection) return unavailableCapability(selectedEntity, datasetId);
  const readiness = inspection.workspaceReadiness;
  if (!readiness) throw new TypeError('Pipe Solver capability inspection requires workspace readiness.');
  return deepFreeze({
    analysisType: readiness.analysisType,
    label: readiness.label,
    description: readiness.description,
    engineeringLevel: readiness.engineeringLevel,
    solverId: readiness.solverId,
    solverVersion: readiness.solverVersion,
    methodId: readiness.methodId,
    methodVersion: readiness.methodVersion,
    codeBasis: readiness.codeBasis,
    applicable: readiness.applicable,
    readyToReview: readiness.readyToReview,
    readyToRun: readiness.readyToRun,
    inputFields: canonicalFields(inspection.fields),
    missingInputs: readiness.missingInputs,
    diagnostics: canonicalDiagnostics(readiness.diagnostics),
    assumptions: readiness.assumptions,
    limitations: readiness.limitations,
    sourceInspection: inspection,
  });
}

function unavailableCapability(selectedEntity, datasetId) {
  const reason = !datasetId ? 'No dataset is loaded.' : !selectedEntity ? 'No Workspace entity is selected.' : 'Capability inspection is unavailable.';
  return deepFreeze({
    ...PIPE_SCREENING_MANIFEST,
    applicable: false,
    readyToReview: false,
    readyToRun: false,
    inputFields: [],
    missingInputs: [],
    diagnostics: [diagnostic('INFO', !datasetId ? PIPE_SOLVER_DIAGNOSTIC_CODES.NO_DATASET : PIPE_SOLVER_DIAGNOSTIC_CODES.NO_SELECTION, reason)],
    assumptions: PIPE_SCREENING_MANIFEST.assumptions,
    limitations: PIPE_SCREENING_MANIFEST.limitations,
    sourceInspection: null,
  });
}

function matchingSession(session, datasetId, selectedEntityId, diagnostics) {
  if (!session) return null;
  const matches = session.schema === 'analysis-session/v1'
    && session.analysisType === PIPE_SCREENING_ANALYSIS_TYPE
    && session.datasetId === datasetId
    && session.targetId === selectedEntityId;
  if (matches) return session;
  diagnostics.push(diagnostic('WARNING', PIPE_SOLVER_DIAGNOSTIC_CODES.SESSION_MISMATCH,
    'The active analysis session does not match the current Pipe Solver dataset and selection.'));
  return null;
}

function matchingLedger(snapshot, datasetId, diagnostics) {
  const entries = Array.isArray(snapshot?.entries) ? snapshot.entries : [];
  if (snapshot?.datasetId && snapshot.datasetId !== datasetId) {
    diagnostics.push(diagnostic('WARNING', PIPE_SOLVER_DIAGNOSTIC_CODES.LEDGER_DATASET_MISMATCH,
      'The active analysis ledger belongs to a different dataset.'));
  }
  const matching = entries.filter((entry) => entry?.schema === 'analysis-ledger-entry/v1'
    && entry.session?.analysisType === PIPE_SCREENING_ANALYSIS_TYPE
    && entry.session?.datasetId === datasetId)
    .sort((left, right) => left.sequence - right.sequence || left.entryId.localeCompare(right.entryId));
  const active = matching.some((entry) => entry.entryId === snapshot?.activeEntryId) ? snapshot.activeEntryId : null;
  return { entries: deepFreeze(matching), activeEntryId: active };
}

function validateCapability(capability, selectedEntity, datasetId, errors) {
  for (const key of ['analysisType','label','description','engineeringLevel','solverId','solverVersion','methodId','methodVersion']) {
    if (capability?.[key] !== PIPE_SCREENING_MANIFEST[key]) errors.push(`Pipe Solver capability ${key} does not match the closed manifest.`);
  }
  if (!Array.isArray(capability?.inputFields) || !Array.isArray(capability?.diagnostics)) errors.push('Pipe Solver capability evidence is incomplete.');
  for (const key of ['codeBasis','assumptions','limitations']) {
    if (canonicalStringify(capability?.[key]) !== canonicalStringify(PIPE_SCREENING_MANIFEST[key])) {
      errors.push(`Pipe Solver capability ${key} does not match the closed manifest.`);
    }
  }
  if (capability?.sourceInspection?.workspaceReadiness?.datasetId !== undefined
    && capability.sourceInspection.workspaceReadiness.datasetId !== datasetId) errors.push('Capability inspection dataset mismatch.');
  if (capability?.sourceInspection?.workspaceReadiness?.targetId !== undefined
    && capability.sourceInspection.workspaceReadiness.targetId !== selectedEntity?.entityId) errors.push('Capability inspection target mismatch.');
}

function validateSession(session, source, errors) {
  if (!session) return;
  if (session.schema !== 'analysis-session/v1') errors.push('Active Pipe Solver session schema is invalid.');
  if (session.analysisType !== PIPE_SCREENING_ANALYSIS_TYPE) errors.push('Active Pipe Solver session capability mismatch.');
  if (session.datasetId !== source.datasetId || session.targetId !== source.selectedEntityId) errors.push('Active Pipe Solver session linkage mismatch.');
}

function validateLedger(source, errors) {
  let previous = null;
  source.matchingLedgerEntries.forEach((entry) => {
    if (entry?.schema !== 'analysis-ledger-entry/v1') errors.push('Pipe Solver ledger entry schema is invalid.');
    if (entry?.datasetId !== source.datasetId
      || entry?.session?.analysisType !== PIPE_SCREENING_ANALYSIS_TYPE || entry?.session?.datasetId !== source.datasetId) {
      errors.push('Pipe Solver ledger contains incompatible evidence.');
    }
    if (previous && (entry.sequence < previous.sequence
      || (entry.sequence === previous.sequence && entry.entryId.localeCompare(previous.entryId) < 0))) {
      errors.push('Pipe Solver ledger ordering is invalid.');
    }
    previous = entry;
  });
  if (source.activeMatchingLedgerEntryId
    && !source.matchingLedgerEntries.some((entry) => entry.entryId === source.activeMatchingLedgerEntryId)) {
    errors.push('Active Pipe Solver ledger entry is not retained.');
  }
}

function baseDiagnostics(datasetId, selectedEntity, diagnostics) {
  const rows = [...diagnostics];
  if (!datasetId) rows.push(diagnostic('INFO', PIPE_SOLVER_DIAGNOSTIC_CODES.NO_DATASET, 'No dataset is loaded.'));
  else if (!selectedEntity) rows.push(diagnostic('INFO', PIPE_SOLVER_DIAGNOSTIC_CODES.NO_SELECTION, 'No Workspace entity is selected.'));
  return rows;
}

function canonicalDiagnostics(rows) {
  const unique = new Map((rows || []).map((row) => [`${row.severity}|${row.code}|${row.message}`, deepFreeze(row)]));
  return deepFreeze([...unique.values()].sort((a, b) => `${a.code}|${a.message}`.localeCompare(`${b.code}|${b.message}`)));
}

function retainedAdapterDiagnostics(rows) {
  return (rows || []).filter((row) => ![
    PIPE_SOLVER_DIAGNOSTIC_CODES.NO_DATASET,
    PIPE_SOLVER_DIAGNOSTIC_CODES.NO_SELECTION,
  ].includes(row.code));
}

function diagnostic(severity, code, message, details = {}) {
  return { severity, code, message, details };
}

function sourceIdentity(value) {
  const capability = value?.capability ? capabilityIdentity(value.capability) : value?.capability;
  return {
    ...value,
    capability,
    activeSession: sessionIdentity(value?.activeSession),
    matchingLedgerEntries: (value?.matchingLedgerEntries || []).map((entry) => ({
      ...entry,
      session: sessionIdentity(entry.session),
    })),
  };
}

function capabilityIdentity(value) {
  const { sourceInspection: _inspection, ...capability } = value;
  return { ...capability, inputFields: canonicalFields(value.inputFields) };
}

function sessionIdentity(value) {
  if (!value) return value;
  return { ...value, inputs: canonicalFields(value.inputs) };
}

function canonicalFields(fields) {
  return deepFreeze([...(fields || [])].sort((left, right) => left.key.localeCompare(right.key)));
}

function contractPayload(value) {
  const { semanticHash: _hash, ...payload } = value || {};
  return payload;
}
