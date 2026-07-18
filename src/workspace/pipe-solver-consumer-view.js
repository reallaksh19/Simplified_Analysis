import { PIPE_SOLVER_VIEW_LIMITATIONS } from '../core/pipe-solver-consumer/index.js';
import {
  capabilitySection,
  diagnosticsSection,
  inputSection,
  ledgerSection,
  resultSection,
  sessionSection,
  summarySection,
} from './pipe-solver-consumer-view-sections.js';

export function renderPipeSolverConsumer(documentRef, model, eligibility, status = {}) {
  const root = documentRef.createElement('main');
  root.className = 'pipe-solver-consumer';
  root.dataset.role = 'pipe-solver-consumer';
  root.setAttribute('aria-label', 'Guarded Pipe Solver evidence review');
  root.append(
    header(documentRef),
    controls(documentRef, model, eligibility, status),
    summarySection(documentRef, model),
    capabilitySection(documentRef, model),
    inputSection(documentRef, model, eligibility),
    sessionSection(documentRef, model),
    resultSection(documentRef, model),
    ledgerSection(documentRef, model, eligibility),
    diagnosticsSection(documentRef, model),
  );
  return root;
}

function header(documentRef) {
  const element = documentRef.createElement('header');
  element.className = 'pipe-solver-consumer__header';
  const title = documentRef.createElement('div');
  title.innerHTML = '<span class="panel-eyebrow">Existing certified capability</span><h1>Pipe Solver</h1>';
  const claim = documentRef.createElement('div');
  claim.className = 'pipe-solver-consumer__claim';
  PIPE_SOLVER_VIEW_LIMITATIONS.forEach((text) => {
    const row = documentRef.createElement('p');
    row.textContent = text;
    claim.append(row);
  });
  element.append(title, claim);
  return element;
}

function controls(documentRef, model, eligibility, status) {
  const section = documentRef.createElement('section');
  section.className = 'pipe-solver-consumer__controls';
  section.setAttribute('aria-label', 'Pipe Solver actions');
  section.append(
    button(documentRef, 'Open Input Review', 'open', eligibility.OPEN_PIPE_SCREENING_SESSION),
    button(documentRef, 'Reset Reviewed Overrides', 'reset', eligibility.RESET_PIPE_SCREENING_SESSION),
    button(documentRef, 'Run Pipe Screening', 'run', eligibility.RUN_PIPE_SCREENING),
    button(documentRef, 'Close Input Review', 'close', eligibility.CLOSE_PIPE_SCREENING_SESSION),
  );
  for (const format of ['json','csv','markdown']) {
    const label = format === 'markdown' ? 'Export Ledger / Report Markdown' : `Export Ledger / Report ${format.toUpperCase()}`;
    const item = button(documentRef, label, null, eligibility.exportFormats.includes(format));
    item.dataset.pipeSolverExport = format;
    section.append(item);
  }
  const output = documentRef.createElement('output');
  output.dataset.role = 'pipe-solver-status';
  output.setAttribute('aria-live', 'polite');
  output.textContent = status.message || stateMessage(model);
  section.append(output);
  return section;
}

function button(documentRef, label, action, enabled) {
  const element = documentRef.createElement('button');
  element.type = 'button';
  element.textContent = label;
  if (action) element.dataset.pipeSolverAction = action;
  element.setAttribute('aria-disabled', String(!enabled));
  element.title = enabled ? '' : 'This action is unavailable for the current exact evidence.';
  return element;
}

function stateMessage(model) {
  if (!model?.summary.datasetAvailable) return 'Import a dataset to make Pipe Solver available.';
  if (!model.summary.selectionAvailable) return 'Select a Workspace entity to inspect pipe-screening applicability.';
  if (!model.summary.applicable) return 'The current selection is not applicable to pipe screening.';
  if (!model.summary.activeSessionStatus) return 'Open an explicit input review session.';
  return `Pipe screening session is ${model.summary.activeSessionStatus}.`;
}
