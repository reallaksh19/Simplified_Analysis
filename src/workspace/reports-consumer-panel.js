export class ReportsConsumerPanel {
  #root; #bus; #consumer; #unsubscribers = [];
  constructor(rootElement, eventBus, consumerController) { this.#root = rootElement; this.#bus = eventBus; this.#consumer = consumerController; }
  init() {
    this.#root.addEventListener('click', this.#onClick);
    this.#root.addEventListener('change', this.#onChange);
    ['workspaceConsumerContext:changed', 'applicationView:changed'].forEach((topic) => this.#unsubscribers.push(this.#bus.subscribe(topic, () => this.render())));
    this.render();
  }
  destroy() {
    this.#root.removeEventListener('click', this.#onClick); this.#root.removeEventListener('change', this.#onChange);
    this.#unsubscribers.splice(0).forEach((off) => off());
  }
  render() {
    const context = this.#consumer.getContext();
    const readiness = this.#consumer.getReadiness('REPORTS');
    if (readiness.readinessState !== 'AVAILABLE') { this.#root.innerHTML = unavailable(readiness); return; }
    const report = context.contracts.activeModelCalculationReport;
    const packageValue = context.contracts.activeModelCalculationPackage;
    const ledger = context.contracts.modelCalculationLedger;
    this.#root.innerHTML = reportHtml(report, packageValue, ledger);
  }
  #onClick = (event) => {
    const action = event.target.closest('[data-reports-action]')?.dataset.reportsAction;
    if (!action) return;
    if (action.startsWith('export-')) this.#bus.publish('modelCalculation:exportRequested', { format: action.replace('export-', '').toUpperCase() });
    if (action === 'select') {
      const entryId = this.#root.querySelector('[data-role="reports-entry-select"]')?.value;
      if (entryId) this.#bus.publish('modelCalculation:selectRequested', { entryId });
    }
  };
  #onChange = () => {};
}

function unavailable(readiness) {
  return `<section class="reports-consumer__empty" aria-live="polite"><h2>Reports</h2><p>Reports are unavailable until an archived model calculation package and matching report are selected.</p><p>${escapeHtml(readiness.readinessState)}</p></section>`;
}
function reportHtml(report, packageValue, ledger) {
  const s = report.sections;
  return `<section class="reports-consumer" data-role="reports-consumer">
    <header><span class="panel-eyebrow">Archived model calculation evidence</span><h1>Reports</h1><p>${escapeHtml(report.statement)}</p></header>
    <div class="reports-consumer__toolbar">${entrySelect(ledger)}<button data-reports-action="select">Select Archived Package</button><button data-reports-action="export-json">Export JSON</button><button data-reports-action="export-csv">Export CSV</button><button data-reports-action="export-markdown">Export Markdown</button></div>
    <dl class="reports-consumer__identity"><dt>Package ID</dt><dd>${escapeHtml(packageValue.packageId)}</dd><dt>Mode</dt><dd>${escapeHtml(packageValue.packageMode)}</dd><dt>Dataset</dt><dd>${escapeHtml(packageValue.datasetId)}</dd><dt>Ledger entry</dt><dd>${escapeHtml(report.entryId)}</dd></dl>
    ${section('Methods', s.methods.map((row) => `${row.methodId} · ${row.engineeringLevel}`))}
    ${section('Assumptions', s.assumptions)}${section('Limitations', s.limitations)}
    ${table('Path / load-case qualification', s.qualification)}
    ${table('W10.5 screened support forces', s.screeningSupportForces)}
    ${table('W10.6 signed and upward support forces', s.verticalBeamSupportForces)}
    ${table('Displacement, rotation and residual evidence', s.residualEvidence)}
    ${section('Blockers', s.blockers)}${section('Diagnostics', s.diagnostics.map((row) => `${row.code}: ${row.message}`))}
  </section>`;
}
function entrySelect(ledger) { return `<label>Archived package <select data-role="reports-entry-select">${ledger.entries.map((entry) => `<option value="${escapeHtml(entry.entryId)}" ${entry.entryId === ledger.activeEntryId ? 'selected' : ''}>${escapeHtml(entry.entryId)}</option>`).join('')}</select></label>`; }
function section(title, rows) { return `<section><h2>${title}</h2>${rows.length ? `<ul>${rows.map((row) => `<li>${escapeHtml(row)}</li>`).join('')}</ul>` : '<p>None</p>'}</section>`; }
function table(title, rows) { if (!rows.length) return section(title, []); const keys = Object.keys(rows[0]).filter((key) => key !== 'diagnostics'); return `<section><h2>${title}</h2><div class="reports-table-wrap"><table><thead><tr>${keys.map((key) => `<th>${escapeHtml(key)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${keys.map((key) => `<td>${escapeHtml(format(row[key]))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`; }
function format(value) { return value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]); }