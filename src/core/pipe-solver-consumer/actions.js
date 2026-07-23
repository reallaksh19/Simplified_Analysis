import { deepFreeze } from '../shared-piping-model/index.js';
import { PIPE_SOLVER_ACTIONS, PIPE_SOLVER_EXPORT_FORMATS } from './constants.js';
import { validatePipeSolverReviewModel } from './model.js';

export function assessPipeSolverActions(model, request = {}) {
  if (!validatePipeSolverReviewModel(model).ok) return unavailableActions();
  const session = model.sourceSnapshot.activeSession;
  const editable = request.fieldKey
    ? model.inputRows.find((row) => row.key === request.fieldKey && row.editable)
    : model.inputRows.find((row) => row.editable);
  const sessionEditable = Boolean(session && ['draft', 'ready'].includes(session.status));
  const entryAvailable = request.entryId
    ? model.ledgerRows.some((row) => row.entryId === request.entryId)
    : model.ledgerRows.length > 0;
  const exportFormatValid = request.format
    ? PIPE_SOLVER_EXPORT_FORMATS.includes(request.format)
    : true;
  return deepFreeze({
    [PIPE_SOLVER_ACTIONS.OPEN_SESSION]: Boolean(
      model.selection.available
      && model.capabilitySummary.readyToReview
      && !session,
    ),
    [PIPE_SOLVER_ACTIONS.UPDATE_OVERRIDE]: Boolean(sessionEditable && editable),
    [PIPE_SOLVER_ACTIONS.RESET_SESSION]: sessionEditable,
    [PIPE_SOLVER_ACTIONS.RUN_SCREENING]: Boolean(
      session
      && session.status === 'ready'
      && model.capabilitySummary.readyToRun
      && Object.keys(session.fieldErrors || {}).length === 0,
    ),
    [PIPE_SOLVER_ACTIONS.CLOSE_SESSION]: Boolean(session),
    [PIPE_SOLVER_ACTIONS.SELECT_LEDGER_ENTRY]: entryAvailable,
    [PIPE_SOLVER_ACTIONS.EXPORT_LEDGER]: Boolean(model.ledgerRows.length && exportFormatValid),
  });
}

function unavailableActions() {
  return deepFreeze(Object.fromEntries(Object.values(PIPE_SOLVER_ACTIONS).map((action) => [action, false])));
}
