import { EXPORT_FORMATS } from '../core/model-calculation-package/index.js';
import { validateWorkspaceConsumerContext } from '../core/workspace-consumers/index.js';
import { EventBus } from './event-bus.js';
import { APPLICATION_EVENTS } from './event-topics.js';
import { MODEL_CALCULATION_EVENTS } from './model-calculation-events.js';

export class ReportsConsumerController {
  constructor(rootElement, consumerController, eventBus = EventBus) {
    this.rootElement = rootElement;
    this.consumerController = consumerController;
    this.eventBus = eventBus;
    this.context = consumerController?.getContext() || null;
    this.readiness = consumerController?.getReadiness('REPORTS') || null;
    this.status = {};
    this.unsubscribeCallbacks = [];
  }
  init() {
    if (this.unsubscribeCallbacks.length) return;
    this.unsubscribeCallbacks = [
      this.eventBus.subscribe(APPLICATION_EVENTS.CONTEXT_CHANGED, ({ context, readiness }) => this.handleContext(context, readiness)),
      this.eventBus.subscribe(MODEL_CALCULATION_EVENTS.EXPORT_COMPLETED, ({ artifact }) => this.handleExport(artifact)),
      this.eventBus.subscribe(MODEL_CALCULATION_EVENTS.EXPORT_FAILED, ({ message }) => this.handleFailure(message)),
      this.eventBus.subscribe(MODEL_CALCULATION_EVENTS.SELECT_FAILED, ({ message }) => this.handleFailure(message)),
    ];
    this.render();
  }
  handleContext(context, readiness) {
    this.context = context;
    this.readiness = readiness.find((row) => row.consumerId === 'REPORTS') || null;
    this.status = {};
    this.render();
  }
  handleExport(artifact) { this.status = { message: `Exported ${artifact.filename}` }; this.render(); }
  handleFailure(message) { this.status = { message: message || 'Report operation failed.' }; this.render(); }
  render() {
    if (!this.rootElement) return;
    const view = renderReportsConsumer(this.rootElement.ownerDocument, this.context, this.readiness, this.status);
    this.rootElement.replaceChildren(view);
    bind(view, 'select', () => this.selectEntry(view));
    bind(view, 'json', () => this.export(EXPORT_FORMATS.JSON));
    bind(view, 'csv', () => this.export(EXPORT_FORMATS.CSV));
    bind(view, 'markdown', () => this.export(EXPORT_FORMATS.MARKDOWN));
  }
  selectEntry(view) {
    const entryId = view.querySelector('[data-reports-control="entry"]')?.value;
    if (entryId) this.eventBus.publish(MODEL_CALCULATION_EVENTS.SELECT_REQUESTED, { entryId });
  }
  export(format) { this.eventBus.publish(MODEL_CALCULATION_EVENTS.EXPORT_REQUESTED, { format }); }
  destroy() {
    this.unsubscribeCallbacks.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeCallbacks = [];
    this.context = null; this.readiness = null; this.consumerController = null; this.status = {};
    this.rootElement?.replaceChildren();
  }
}

export function renderReportsConsumer(documentRef, context, readiness, status = {}) {
  const section = documentRef.createElement('section');
  section.className = 'reports-consumer'; section.dataset.role = 'reports-consumer';
  const validation = validateWorkspaceConsumerContext(context);
  const available = validation.ok && readiness?.readinessState === 'AVAILABLE';
  const report = available ? context.contracts.activeModelCalculationReport : null;
  const packageValue = available ? context.contracts.activeModelCalculationPackage : null;
  const ledger = available ? context.contracts.modelCalculationLedger : null;
  if (!report || !packageValue || !ledger) { section.innerHTML = unavailableMarkup(readiness); return section; }
  section.innerHTML = availableMarkup(report, ledger, status);
  return section;
}

function availableMarkup(report, ledger, status) {
  const sections = report.sections || {};
  return `
    <header class="reports-consumer__header"><div><span class="panel-eyebrow">Archived model calculation evidence</span><h1>Reports</h1></div><p class="reports-consumer__disclaimer">${escapeHtml(report.statement)}</p></header>
    <section class="reports-consumer__controls" aria-label="Archived report actions">
      <label>Archived package<select data-reports-control="entry">${entryOptions(ledger)}</select></label>
      <button type="button" data-reports-action="select">Select Archived Package</button>
      <button type="button" data-reports-action="json">Export Package JSON</button>
      <button type="button" data-reports-action="csv">Export Report CSV</button>
      <button type="button" data-reports-action="markdown">Export Report Markdown</button>
      <output data-role="reports-status">${escapeHtml(status.message || '')}</output>
    </section>
    ${identitySection(sections.packageIdentity || {})}
    ${methodSection(arrayOf(sections.methods))}
    ${listSection('Assumptions', arrayOf(sections.assumptions))}
    ${listSection('Limitations', arrayOf(sections.limitations))}
    ${qualificationSection(arrayOf(sections.qualification))}
    ${screeningSection(arrayOf(sections.screeningSupportForces))}
    ${beamSection(arrayOf(sections.verticalBeamSupportForces))}
    ${residualSection(arrayOf(sections.residualEvidence))}
    ${listSection('Blockers', arrayOf(sections.blockers))}
    ${diagnosticSection(arrayOf(sections.diagnostics))}
    <footer class="reports-consumer__footer">${escapeHtml(report.statement)}</footer>`;
}
function identitySection(identity) {
  const rows = [['Package ID',identity.packageId],['Package mode',identity.packageMode],['Dataset ID',identity.datasetId],['Ledger entry',identity.entryId],['Archive key',identity.archiveKey],['Sequence',identity.sequence]];
  return `<section class="reports-card" data-role="reports-package-identity"><h2>Package identity</h2>${definitionList(rows)}</section>`;
}
function methodSection(rows) {
  const body = rows.map((row) => `<tr><td>${escapeHtml(row.methodId)}</td><td>${escapeHtml(row.methodVersion)}</td><td>${escapeHtml(row.engineeringLevel)}</td><td>${escapeHtml(row.profileId)}</td></tr>`).join('');
  return tableSection('Methods and engineering levels','reports-methods',['Method ID','Version','Engineering level','Profile'],body);
}
function qualificationSection(rows) {
  const body = rows.map((row) => `<tr><td>${escapeHtml(row.pathId)}</td><td>${escapeHtml(row.loadCaseId)}</td><td>${escapeHtml(row.screeningQualification)}</td><td>${escapeHtml(row.beamQualification)}</td><td>${number(row.screenedAppliedForceN)}</td><td>${number(row.beamAppliedForceN)}</td></tr>`).join('');
  return tableSection('Path and load-case qualification','reports-qualification',['Path','Load case','Screening','Beam','Screened applied N','Beam applied N'],body);
}
function screeningSection(rows) {
  const body = rows.map((row) => `<tr><td>${escapeHtml(row.pathId)}</td><td>${escapeHtml(row.loadCaseId)}</td><td>${escapeHtml(row.supportKey)}</td><td>${number(row.screenedVerticalForceN)}</td><td>${escapeHtml(row.qualification)}</td></tr>`).join('');
  return tableSection('W10.5 screened support forces','reports-screening-forces',['Path','Load case','Support','screenedVerticalForceN','Qualification'],body);
}
function beamSection(rows) {
  const body = rows.map((row) => `<tr><td>${escapeHtml(row.pathId)}</td><td>${escapeHtml(row.loadCaseId)}</td><td>${escapeHtml(row.supportKey)}</td><td>${number(row.signedSupportForceN)}</td><td>${number(row.upwardSupportForceN)}</td><td>${escapeHtml(row.qualification)}</td></tr>`).join('');
  return tableSection('W10.6 vertical-beam support forces','reports-beam-forces',['Path','Load case','Support','signedSupportForceN','upwardSupportForceN','Qualification'],body);
}
function residualSection(rows) {
  const body = rows.map((row) => `<tr><td>${escapeHtml(row.pathId)}</td><td>${escapeHtml(row.loadCaseId)}</td><td>${number(row.maximumAbsoluteDisplacementM)}</td><td>${number(row.maximumAbsoluteRotationRad)}</td><td>${number(row.forceResidualN)}</td><td>${number(row.momentResidualNm)}</td><td>${number(row.matrixResidualN)}</td></tr>`).join('');
  return tableSection('Displacement, rotation and residual evidence','reports-residuals',['Path','Load case','Max displacement m','Max rotation rad','Force residual N','Moment residual Nm','Matrix residual N'],body);
}
function diagnosticSection(rows) {
  const body = rows.map((row) => `<tr><td>${escapeHtml(row.code)}</td><td>${escapeHtml(row.severity)}</td><td>${escapeHtml(row.scope || row.contractKey || '')}</td><td>${escapeHtml(row.message || '')}</td></tr>`).join('');
  return tableSection('Diagnostics','reports-diagnostics',['Code','Severity','Scope','Message'],body);
}
function listSection(title, rows) { const content = rows.length ? `<ul>${rows.map((row)=>`<li>${escapeHtml(textValue(row))}</li>`).join('')}</ul>` : '<p class="panel-empty">None recorded.</p>'; return `<section class="reports-card"><h2>${escapeHtml(title)}</h2>${content}</section>`; }
function tableSection(title, role, headings, rows) { const body = rows || `<tr><td colspan="${headings.length}">No evidence recorded.</td></tr>`; return `<section class="reports-card" data-role="${role}"><h2>${escapeHtml(title)}</h2><div class="reports-table-wrap"><table><thead><tr>${headings.map((item)=>`<th>${escapeHtml(item)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div></section>`; }
function definitionList(rows) { return `<dl>${rows.map(([key,value])=>`<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value ?? '—')}</dd></div>`).join('')}</dl>`; }
function entryOptions(ledger) { return arrayOf(ledger.entries).slice().reverse().map((row)=>`<option value="${escapeHtml(row.entryId)}" ${row.entryId === ledger.activeEntryId ? 'selected' : ''}>#${escapeHtml(row.sequence)} · ${escapeHtml(row.packageId)}</option>`).join(''); }
function unavailableMarkup(readiness) { const message = readiness?.diagnostics?.[0]?.message || 'Create and select a validated model calculation package in Workspace before opening Reports.'; return `<header class="reports-consumer__header"><div><span class="panel-eyebrow">Archived model calculation evidence</span><h1>Reports</h1></div></header><section class="reports-card" data-role="reports-unavailable"><h2>Report unavailable</h2><p class="panel-empty">${escapeHtml(message)}</p></section>`; }
function arrayOf(value) { return Array.isArray(value) ? value : []; }
function textValue(value) { if (typeof value === 'string') return value; if (value && typeof value === 'object') return value.message || value.code || JSON.stringify(value); return String(value ?? ''); }
function number(value) { return Number.isFinite(value) ? String(value) : '—'; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g,(char)=>({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char])); }
function bind(view, action, callback) { view.querySelector(`[data-reports-action="${action}"]`)?.addEventListener('click', callback); }
