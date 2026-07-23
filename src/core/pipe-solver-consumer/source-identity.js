import { deepFreeze } from '../shared-piping-model/index.js';
import {
  projectSessionReadiness,
  projectWorkspaceReadiness,
} from './session-evidence.js';

export function buildPipeSolverSourceIdentity(value = {}) {
  return deepFreeze({
    schema: value.schema,
    datasetId: value.datasetId,
    workspaceVersion: value.workspaceVersion,
    selectedEntityId: value.selectedEntityId,
    contextSemanticHash: value.contextSemanticHash,
    selectedEntity: value.selectedEntity,
    capability: value.capability,
    activeSession: sessionIdentity(value.activeSession),
    matchingLedgerEntries: (value.matchingLedgerEntries || []).map(ledgerIdentity),
    activeMatchingLedgerEntryId: value.activeMatchingLedgerEntryId,
    diagnostics: value.diagnostics,
  });
}

function ledgerIdentity(entry) {
  return deepFreeze({
    schema: entry.schema,
    entryId: entry.entryId,
    sequence: entry.sequence,
    archiveKey: entry.archiveKey,
    datasetId: entry.datasetId,
    session: sessionIdentity(entry.session),
  });
}

function sessionIdentity(session) {
  if (!session) return null;
  return deepFreeze({
    ...session,
    readiness: projectSessionReadiness(session.readiness),
    workspaceReadiness: projectWorkspaceReadiness(session.workspaceReadiness),
  });
}
