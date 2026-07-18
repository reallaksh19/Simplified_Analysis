import { deepFreeze } from '../shared-piping-model/index.js';
import { PIPE_SCREENING_ANALYSIS_TYPE } from './constants.js';
import { validatePipeSolverReviewModel } from './review-model.js';

const EDITABLE_STATES = new Set(['draft', 'ready']);
export const PIPE_SOLVER_EXPORT_FORMATS = Object.freeze(['json', 'csv', 'markdown']);

export function assessPipeSolverActions(model) {
  if (!model || !validatePipeSolverReviewModel(model).ok) return unavailableActions();
  const session = model.sessionSummary;
  const editable = Boolean(session && EDITABLE_STATES.has(session.status));
  const matching = Boolean(session && model.selection?.entityId === session.targetId
    && session.analysisType === PIPE_SCREENING_ANALYSIS_TYPE);
  const fieldErrorsEmpty = Object.keys(session?.fieldErrors || {}).length === 0;
  return deepFreeze({
    OPEN_PIPE_SCREENING_SESSION: Boolean(model.selection && model.capabilitySummary.readyToReview && !session),
    UPDATE_PIPE_SCREENING_OVERRIDE: matching && editable,
    RESET_PIPE_SCREENING_SESSION: matching && editable,
    RUN_PIPE_SCREENING: matching && session.status === 'ready'
      && session.workspaceReadiness?.readyToRun === true && fieldErrorsEmpty,
    CLOSE_PIPE_SCREENING_SESSION: matching,
    SELECT_ANALYSIS_LEDGER_ENTRY: model.ledgerRows.length > 0,
    EXPORT_ANALYSIS_LEDGER: model.ledgerRows.length > 0,
    editableFieldKeys: editable ? model.inputRows.filter((row) => row.editable).map((row) => row.key) : [],
    selectableLedgerEntryIds: model.ledgerRows.map((row) => row.entryId),
    exportFormats: model.ledgerRows.length ? PIPE_SOLVER_EXPORT_FORMATS : [],
  });
}

export function canUpdatePipeSolverField(model, fieldKey) {
  return assessPipeSolverActions(model).editableFieldKeys.includes(String(fieldKey || ''));
}

export function canSelectPipeSolverLedgerEntry(model, entryId) {
  return assessPipeSolverActions(model).selectableLedgerEntryIds.includes(String(entryId || ''));
}

export function canExportPipeSolverLedger(model, format) {
  return assessPipeSolverActions(model).exportFormats.includes(String(format || ''));
}

function unavailableActions() {
  return deepFreeze({
    OPEN_PIPE_SCREENING_SESSION: false,
    UPDATE_PIPE_SCREENING_OVERRIDE: false,
    RESET_PIPE_SCREENING_SESSION: false,
    RUN_PIPE_SCREENING: false,
    CLOSE_PIPE_SCREENING_SESSION: false,
    SELECT_ANALYSIS_LEDGER_ENTRY: false,
    EXPORT_ANALYSIS_LEDGER: false,
    editableFieldKeys: [],
    selectableLedgerEntryIds: [],
    exportFormats: [],
  });
}
