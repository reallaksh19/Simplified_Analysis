import { PIPE_SOLVER_ACTIONS, PIPE_SOLVER_EXPORT_FORMATS } from '../core/pipe-solver-consumer/index.js';

export function renderPipeSolverConsumer(documentRef, model, eligibility = {}, status = {}) {
  const section = documentRef.createElement('section');
  section.className = 'pipe-solver-consumer';
  section.dataset.role = 'pipe-solver-consumer';
  section.innerHTML = model ? availableMarkup(model, eligibility, status) : unavailableMarkup(status);
  return section;
}

function availableMarkup(model, eligibility, status) {
  return `
    <header class="pipe-solver-consumer__header">
      <div><span class="panel-eyebrow">Guarded existing capability consumer</span><h1>Pipe Solver</h1></div>
      <p class="pipe-solver-consumer__claim">Benchmarked simplified 2D screening only. Not final piping-code stress analysis.</p>
    </header>
    ${controls(model, eligibility, status)}
    ${identityCard(model)}
    ${selectionCard(model.selection)}
    ${capabilityCard(model.capabilitySummary)}
    ${inputCard(model, eligibility)}
    ${sessionCard(model.sessionSummary)}
    ${resultCard(model.currentResult)}
    ${ledgerCard(model, eligibility)}
    ${listCard('Engineering assumptions', model.assumptions, 'pipe-solver-assumptions')}
    ${listCard('Engineering limitations', model.limitations, 'pipe-solver-limitations')}
    ${diagnosticsCard(model.diagnostics)}
  `;
}

function controls(model, eligibility, status) {
  return `<section class="pipe-solver-consumer__controls" aria-label="Pipe Solver actions">
    ${action('open', 'Open Input Review', eligibility[PIPE_SOLVER_ACTIONS.OPEN_SESSION])}
    ${action('reset', 'Reset Reviewed Overrides', eligibility[PIPE_SOLVER_ACTIONS.RESET_SESSION])}
    ${action('run', 'Run Reviewed Pipe Screening', eligibility[PIPE_SOLVER_ACTIONS.RUN_SCREENING])}
    ${action('close', 'Close Input Review', eligibility[PIPE_SOLVER_ACTIONS.CLOSE_SESSION])}
    <label>Export current analysis report
      <select data-pipe-solver-export-format aria-label="Analysis export format">
        ${PIPE_SOLVER_EXPORT_FORMATS.map((format) => `<option value="${e(format)}">${e(format.toUpperCase())}</option>`).join('')}
      </select>
    </label>
    ${action('export', 'Export Analysis Report', eligibility[PIPE_SOLVER_ACTIONS.EXPORT_LEDGER])}
    <output data-role="pipe-solver-status" aria-live="polite">${e(status.message || '')}</output>
  </section>`;
}

function identityCard(model) {
  return card('Review identity', 'pipe-solver-identity', definitionList([
    ['Dataset ID', model.datasetId],
    ['Review model ID', model.reviewModelId],
    ['Context semantic hash', model.contextSemanticHash],
    ['Source semantic hash', model.sourceReferences.sourceSemanticHash],
    ['Matching ledger entries', model.summary.matchingLedgerEntryCount],
    ['Active matching entry', model.summary.activeMatchingLedgerEntryId],
  ]));
}

function selectionCard(row) {
  return card('Selected Workspace entity', 'pipe-solver-selection', definitionList([
    ['Available', row.available],
    ['Entity ID', row.entityId],
    ['Entity type', row.entityType],
    ['Name', row.name],
    ['Line identity', row.lineIdentity],
    ['System identity', row.systemIdentity],
    ['Source path', row.sourcePath],
  ]));
}

function capabilityCard(row) {
  return card('Existing pipe-screening capability', 'pipe-solver-capability', definitionList([
    ['Capability ID', row.analysisType],
    ['Engineering level', row.engineeringLevel],
    ['Solver', manifest(row.solverId, row.solverVersion)],
    ['Method', manifest(row.methodId, row.methodVersion)],
    ['Applicable', row.applicable],
    ['Ready to review', row.readyToReview],
    ['Ready to run', row.readyToRun],
    ['Missing inputs', row.missingInputKeys.join(', ') || 'None'],
  ]));
}

function inputCard(model, eligibility) {
  const sessionEditable = eligibility[PIPE_SOLVER_ACTIONS.UPDATE_OVERRIDE];
  const body = model.inputRows.map((row) => `<tr data-field-key="${e(row.key)}">
    <td>${e(row.key)}</td><td>${e(row.label)}</td><td>${e(row.unit)}</td>
    <td>${e(display(row.value))}</td><td>${e(row.source)}</td><td>${e(row.sourcePath)}</td>
    <td>${inputControl(row, sessionEditable)}</td><td>${e(row.fieldError || '—')}</td>
  </tr>`).join('');
  return tableCard('Input evidence and reviewed overrides', 'pipe-solver-inputs',
    ['Key', 'Label', 'Unit', 'Value', 'Source', 'Source path', 'Override', 'Field error'], body);
}

function inputControl(row, sessionEditable) {
  if (!row.editable) return 'Read only';
  const disabled = !sessionEditable;
  const value = row.overrideValue ?? row.value ?? '';
  return `<input type="text" data-pipe-solver-field="${e(row.key)}" value="${e(value)}" ${disabled ? 'disabled' : ''} aria-label="Override ${e(row.label)}">`;
}

function sessionCard(row) {
  if (!row.available) return card('Analysis session', 'pipe-solver-session', '<p class="panel-empty">No matching active pipe-screening session.</p>');
  return card('Analysis session', 'pipe-solver-session', definitionList([
    ['Session ID', row.sessionId], ['Version', row.version], ['Status', row.status],
    ['Dataset ID', row.datasetId], ['Workspace version', row.workspaceVersion],
    ['Target ID', row.targetId], ['Request ID', row.requestId],
    ['Field errors', row.fieldErrorCount], ['Failure', json(row.failure)],
  ]));
}

function resultCard(result) {
  if (!result) return card('Current result', 'pipe-solver-result', '<p class="panel-empty">No accepted completed result for the matching active session.</p>');
  return card('Current accepted benchmarked-screening result', 'pipe-solver-result', `
    ${definitionList([
      ['Schema', result.schemaVersion], ['Module', result.moduleId], ['Method', result.methodId],
      ['Engineering level', result.engineeringLevel], ['Status', result.status],
      ['Formula IDs', (result.formulaIds || []).join(', ')], ['Settings hash', result.settingsHash],
      ['Data status', json(result.dataStatus)], ['Summary', json(result.summary)],
    ])}
    <h3>Results</h3><pre>${e(json(result.results))}</pre>
    <h3>Formula trace</h3>${trace(result.formulaTrace)}
    <h3>Warnings</h3>${list(result.warnings)}
    <h3>Diagnostics</h3>${diagnosticList(result.diagnostics)}
  `);
}

function ledgerCard(model, eligibility) {
  const body = model.ledgerRows.map((row) => `<tr data-entry-id="${e(row.entryId)}" class="${row.active ? 'pipe-solver-ledger-row--active' : ''}">
    <td>${e(row.sequence)}</td><td>${e(row.entryId)}</td><td>${e(row.sessionId)}</td><td>${e(row.targetId)}</td>
    <td>${e(row.status)}</td><td>${e(row.engineeringLevel)}</td><td>${e(row.methodId)}</td><td>${e(row.resultStatus)}</td>
    <td>${e(row.warningCount)}</td><td>${e(row.diagnosticCount)}</td><td>${e(row.failureCode)}</td><td>${e(row.failureMessage)}</td>
    <td>${actionForEntry(row.entryId, eligibility[PIPE_SOLVER_ACTIONS.SELECT_LEDGER_ENTRY])}</td>
  </tr>`).join('');
  return tableCard('Matching current-dataset pipe-screening ledger history', 'pipe-solver-ledger',
    ['Sequence', 'Entry', 'Session', 'Target', 'Status', 'Level', 'Method', 'Result', 'Warnings', 'Diagnostics', 'Failure code', 'Failure message', 'Active'], body);
}

function diagnosticsCard(rows) {
  const body = rows.map((row) => `<tr><td>${e(row.code)}</td><td>${e(row.severity)}</td><td>${e(row.scope)}</td><td>${e(row.message)}</td><td>${e(json(row.data))}</td></tr>`).join('');
  return tableCard('Deterministic review diagnostics', 'pipe-solver-diagnostics', ['Code', 'Severity', 'Scope', 'Message', 'Evidence'], body);
}

function action(name, label, enabled) {
  return `<button type="button" data-pipe-solver-action="${name}" aria-disabled="${String(!enabled)}" ${enabled ? '' : 'disabled'}>${e(label)}</button>`;
}
function actionForEntry(entryId, enabled) {
  return `<button type="button" data-pipe-solver-ledger-entry="${e(entryId)}" ${enabled ? '' : 'disabled'}>Set active</button>`;
}
function unavailableMarkup(status) {
  return `<header class="pipe-solver-consumer__header"><div><span class="panel-eyebrow">Guarded existing capability consumer</span><h1>Pipe Solver</h1></div></header><section class="pipe-solver-card" data-role="pipe-solver-unavailable"><h2>Pipe Solver unavailable</h2><p class="panel-empty">${e(status.message || 'Import a dataset with valid shared-model and topology evidence.')}</p></section>`;
}
function card(title, role, content) { return `<section class="pipe-solver-card" data-role="${role}"><h2>${e(title)}</h2>${content}</section>`; }
function tableCard(title, role, headings, body) { return card(title, role, `<div class="pipe-solver-table-wrap"><table aria-label="${e(title)}"><thead><tr>${headings.map((heading) => `<th scope="col">${e(heading)}</th>`).join('')}</tr></thead><tbody>${body || `<tr><td colspan="${headings.length}">No evidence recorded.</td></tr>`}</tbody></table></div>`); }
function listCard(title, rows, role) { return card(title, role, rows.length ? `<ul>${rows.map((row) => `<li>${e(row)}</li>`).join('')}</ul>` : '<p class="panel-empty">None recorded.</p>'); }
function definitionList(rows) { return `<dl>${rows.map(([key, value]) => `<div><dt>${e(key)}</dt><dd>${e(value ?? '—')}</dd></div>`).join('')}</dl>`; }
function diagnosticList(rows) { return rows?.length ? `<ul>${rows.map((row) => `<li>${e(`${row.code || ''}: ${row.message || ''}`)}</li>`).join('')}</ul>` : '<p>None.</p>'; }
function trace(rows) { return rows?.length ? rows.map((row) => `<code>${e(json(row))}</code>`).join('<br>') : '<p>None.</p>'; }
function list(rows) { return rows?.length ? `<ul>${rows.map((row) => `<li>${e(typeof row === 'string' ? row : json(row))}</li>`).join('')}</ul>` : '<p>None.</p>'; }
function manifest(id, version) { return id ? `${id} · ${version || '—'}` : 'Unavailable'; }
function display(value) { return value === null || value === undefined ? '—' : value; }
function json(value) { return value === undefined || value === null ? 'null' : JSON.stringify(value); }
function e(value) { return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }
