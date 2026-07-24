export class PcfConsumerView {
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.handlers = null;
    this.elements = {};
    this.listenerRows = [];
  }

  init(handlers) {
    if (!this.rootElement || this.handlers) return;
    this.handlers = handlers;
    this.rootElement.replaceChildren(this.build());
    this.bind(this.elements.textarea, 'input', () => handlers.onTextChanged(this.elements.textarea.value));
    this.bind(this.elements.file, 'change', () => handlers.onFileSelected(this.elements.file.files?.[0] || null));
    this.bind(this.elements.parse, 'click', handlers.onParse);
    this.bind(this.elements.cancel, 'click', handlers.onCancel);
    this.bind(this.elements.adopt, 'click', handlers.onAdopt);
    this.bind(this.elements.exportJson, 'click', () => handlers.onExport('json'));
    this.bind(this.elements.exportCsv, 'click', () => handlers.onExport('csv'));
  }

  render(state) {
    if (!this.rootElement || !this.handlers) return;
    if (this.elements.textarea.value !== state.sourceText) this.elements.textarea.value = state.sourceText;
    this.elements.sourceName.textContent = state.sourceName || 'No file selected';
    this.elements.status.textContent = state.failureCode ? `${state.failureCode}: ${state.message}` : state.message;
    this.elements.status.dataset.phase = state.phase;
    this.elements.parse.disabled = !state.sourceText.trim();
    this.elements.cancel.disabled = !state.sourceText && !state.reviewModel;
    this.elements.adopt.disabled = !state.reviewModel?.adoption?.allowed;
    this.elements.exportJson.disabled = !state.reviewModel;
    this.elements.exportCsv.disabled = !state.reviewModel;
    this.renderReview(state.reviewModel);
  }

  resetFileInput() {
    if (this.elements.file) this.elements.file.value = '';
  }

  destroy() {
    this.listenerRows.forEach(({ element, type, listener }) => element.removeEventListener(type, listener));
    this.listenerRows = [];
    this.rootElement?.replaceChildren();
    this.handlers = null;
    this.elements = {};
  }

  build() {
    const documentRef = this.rootElement.ownerDocument;
    const section = documentRef.createElement('section');
    section.className = 'pcf-consumer';
    section.dataset.role = 'pcf-consumer';

    const header = documentRef.createElement('header');
    header.className = 'pcf-consumer__header';
    const heading = documentRef.createElement('div');
    const eyebrow = documentRef.createElement('span');
    eyebrow.className = 'panel-eyebrow';
    eyebrow.textContent = 'Source intake and review';
    const title = documentRef.createElement('h1');
    title.textContent = 'PCF';
    heading.append(eyebrow, title);
    const claim = documentRef.createElement('p');
    claim.className = 'pcf-consumer__claim';
    claim.textContent = 'PCF parsing is staged and non-destructive. Only explicit adoption may replace the active Workspace dataset.';
    header.append(heading, claim);

    const intake = this.card('PCF source');
    const fileLabel = documentRef.createElement('label');
    fileLabel.className = 'pcf-consumer__file';
    const fileText = documentRef.createElement('span');
    fileText.textContent = 'Select PCF file';
    const file = documentRef.createElement('input');
    file.type = 'file';
    file.accept = '.pcf,text/plain';
    file.dataset.role = 'pcf-file';
    fileLabel.append(fileText, file);
    const sourceName = documentRef.createElement('output');
    sourceName.dataset.role = 'pcf-source-name';
    const textarea = documentRef.createElement('textarea');
    textarea.dataset.role = 'pcf-source-text';
    textarea.rows = 14;
    textarea.spellcheck = false;
    textarea.setAttribute('aria-label', 'PCF source text');
    textarea.placeholder = 'Paste PCF text here. Source text is treated as plain text.';
    const controls = documentRef.createElement('div');
    controls.className = 'pcf-consumer__controls';
    const parse = button(documentRef, 'Parse and Review', 'pcf-parse');
    const cancel = button(documentRef, 'Cancel Staged Intake', 'pcf-cancel');
    const adopt = button(documentRef, 'Adopt into Workspace', 'pcf-adopt');
    const exportJson = button(documentRef, 'Export Review JSON', 'pcf-export-json');
    const exportCsv = button(documentRef, 'Export Review CSV', 'pcf-export-csv');
    controls.append(parse, cancel, adopt, exportJson, exportCsv);
    const status = documentRef.createElement('output');
    status.className = 'pcf-consumer__status';
    status.dataset.role = 'pcf-status';
    status.setAttribute('aria-live', 'polite');
    intake.body.append(fileLabel, sourceName, textarea, controls, status);

    const review = documentRef.createElement('div');
    review.dataset.role = 'pcf-review';
    section.append(header, intake.section, review);
    this.elements = { file, sourceName, textarea, parse, cancel, adopt, exportJson, exportCsv, status, review };
    return section;
  }

  renderReview(model) {
    const root = this.elements.review;
    root.replaceChildren();
    if (!model) {
      const empty = root.ownerDocument.createElement('p');
      empty.className = 'panel-empty';
      empty.textContent = 'No parsed PCF review is materialized.';
      root.append(empty);
      return;
    }
    root.append(
      this.summaryCard(model),
      this.geometryCard(model),
      this.diagnosticsCard(model),
      this.componentsCard(model),
    );
  }

  summaryCard(model) {
    const card = this.card('Review summary');
    const list = card.body.ownerDocument.createElement('dl');
    list.append(
      definition(card.body.ownerDocument, 'Source', model.sourceName),
      definition(card.body.ownerDocument, 'Components', model.summary.componentCount),
      definition(card.body.ownerDocument, 'Model components', model.summary.modelComponentCount),
      definition(card.body.ownerDocument, 'Review-only components', model.summary.reviewOnlyComponentCount),
      definition(card.body.ownerDocument, 'Errors', model.summary.errorCount),
      definition(card.body.ownerDocument, 'Warnings', model.summary.warningCount),
      definition(card.body.ownerDocument, 'Adoption', model.adoption.allowed ? 'READY' : 'BLOCKED'),
    );
    const statement = card.body.ownerDocument.createElement('p');
    statement.textContent = model.statement;
    card.body.append(list, statement);
    return card.section;
  }

  geometryCard(model) {
    const card = this.card('Canonical geometry preview');
    const list = card.body.ownerDocument.createElement('dl');
    list.append(
      definition(card.body.ownerDocument, 'Valid', String(model.canonicalGeometrySummary.valid)),
      definition(card.body.ownerDocument, 'Unit', model.canonicalGeometrySummary.unit || '—'),
      definition(card.body.ownerDocument, 'Nodes', model.canonicalGeometrySummary.nodeCount),
      definition(card.body.ownerDocument, 'Segments', model.canonicalGeometrySummary.segmentCount),
      definition(card.body.ownerDocument, 'Support points', model.canonicalGeometrySummary.supportPointCount),
    );
    card.body.append(list);
    return card.section;
  }

  diagnosticsCard(model) {
    const card = this.card('Diagnostics');
    if (!model.diagnostics.length) {
      const empty = card.body.ownerDocument.createElement('p');
      empty.textContent = 'No parser or adoption diagnostics.';
      card.body.append(empty);
      return card.section;
    }
    const list = card.body.ownerDocument.createElement('ul');
    model.diagnostics.forEach((row) => {
      const item = card.body.ownerDocument.createElement('li');
      const location = row.lineNumber ? ` line ${row.lineNumber}` : '';
      item.textContent = `${row.severity} ${row.code}${location}: ${row.message}`;
      list.append(item);
    });
    card.body.append(list);
    return card.section;
  }

  componentsCard(model) {
    const card = this.card('Component and source review');
    const wrap = card.body.ownerDocument.createElement('div');
    wrap.className = 'pcf-consumer__table-wrap';
    const table = card.body.ownerDocument.createElement('table');
    const head = card.body.ownerDocument.createElement('thead');
    const heading = card.body.ownerDocument.createElement('tr');
    ['#','Type','Identity','Lines','Points','Attributes','Source evidence'].forEach((label) => {
      const th = card.body.ownerDocument.createElement('th');
      th.scope = 'col';
      th.textContent = label;
      heading.append(th);
    });
    head.append(heading);
    const body = card.body.ownerDocument.createElement('tbody');
    model.components.forEach((row) => body.append(this.componentRow(row)));
    table.append(head, body);
    wrap.append(table);
    card.body.append(wrap);
    return card.section;
  }

  componentRow(row) {
    const documentRef = this.rootElement.ownerDocument;
    const tr = documentRef.createElement('tr');
    tr.append(
      cell(documentRef, row.sourceIndex + 1),
      cell(documentRef, `${row.type} (${row.adoptionMode})`),
      cell(documentRef, row.componentId),
      cell(documentRef, `${row.sourceLineStart ?? '—'}–${row.sourceLineEnd ?? '—'}`),
      detailsCell(documentRef, `${row.pointCount} endpoint(s), ${row.branchPointCount} branch point(s)`, pointLines(row)),
      detailsCell(documentRef, `${Object.keys(row.attributes).length} attribute(s)`, Object.entries(row.attributes).map(([key, value]) => `${key}: ${value}`)),
      detailsCell(documentRef, 'Raw PCF lines', row.rawLines),
    );
    return tr;
  }

  card(titleText) {
    const documentRef = this.rootElement.ownerDocument;
    const section = documentRef.createElement('section');
    section.className = 'pcf-card';
    const title = documentRef.createElement('h2');
    title.textContent = titleText;
    const body = documentRef.createElement('div');
    body.className = 'pcf-card__body';
    section.append(title, body);
    return { section, body };
  }

  bind(element, type, listener) {
    element.addEventListener(type, listener);
    this.listenerRows.push({ element, type, listener });
  }
}

function button(documentRef, label, role) {
  const element = documentRef.createElement('button');
  element.type = 'button';
  element.textContent = label;
  element.dataset.role = role;
  return element;
}

function definition(documentRef, label, value) {
  const row = documentRef.createElement('div');
  const term = documentRef.createElement('dt');
  term.textContent = label;
  const description = documentRef.createElement('dd');
  description.textContent = String(value ?? '—');
  row.append(term, description);
  return row;
}

function cell(documentRef, value) {
  const td = documentRef.createElement('td');
  td.textContent = String(value ?? '');
  return td;
}

function detailsCell(documentRef, summaryText, lines) {
  const td = documentRef.createElement('td');
  const details = documentRef.createElement('details');
  const summary = documentRef.createElement('summary');
  summary.textContent = summaryText;
  const pre = documentRef.createElement('pre');
  pre.textContent = lines.length ? lines.join('\n') : '—';
  details.append(summary, pre);
  td.append(details);
  return td;
}

function pointLines(row) {
  const lines = row.points.map((point, index) => `END-POINT ${index + 1}: ${pointText(point)}`);
  if (row.centrePoint) lines.push(`CENTRE-POINT: ${pointText(row.centrePoint)}`);
  row.branchPoints.forEach((point, index) => lines.push(`BRANCH${index + 1}-POINT: ${pointText(point)}`));
  return lines;
}

function pointText(point) {
  return `${point.x}, ${point.y}, ${point.z}${point.bore ? `; bore ${point.bore}` : ''}`;
}
