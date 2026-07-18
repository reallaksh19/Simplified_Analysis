export function summarySection(documentRef, model) {
  return card(documentRef, 'Pipe Solver source snapshot', 'pipe-solver-summary', [
    ['Dataset', model?.datasetId || 'None'],
    ['Selected entity', model?.selection?.entityId || 'None'],
    ['Review model', model?.reviewModelId || 'Unavailable'],
    ['Context hash', model?.contextSemanticHash || 'None'],
  ]);
}

export function capabilitySection(documentRef, model) {
  const capability = model?.capabilitySummary;
  return card(documentRef, 'Capability and readiness', 'pipe-solver-capability', [
    ['Capability ID', capability?.analysisType || 'pipe-screening'],
    ['Engineering level', capability?.engineeringLevel || 'BENCHMARKED_SCREENING'],
    ['Solver', `${capability?.solverId || ''} ${capability?.solverVersion || ''}`.trim()],
    ['Method', `${capability?.methodId || ''} ${capability?.methodVersion || ''}`.trim()],
    ['Applicable', yesNo(capability?.applicable)],
    ['Ready to review', yesNo(capability?.readyToReview)],
    ['Ready to run', yesNo(capability?.readyToRun)],
    ['Code basis', stringify(capability?.codeBasis)],
    ['Missing inputs', stringify(capability?.missingInputs)],
  ]);
}

export function inputSection(documentRef, model, eligibility) {
  const section = sectionCard(documentRef, 'Input evidence and reviewed overrides', 'pipe-solver-inputs');
  section.append(table(documentRef,
    ['Key','Value','Unit','Source','Source path','Override / error'],
    (model?.inputRows || []).map((row) => [
      row.key,
      valueText(row.value),
      row.unit,
      row.source,
      row.sourcePath,
      inputCell(documentRef, row, eligibility),
    ])));
  return section;
}

export function sessionSection(documentRef, model) {
  const session = model?.sessionSummary;
  return card(documentRef, 'Active analysis session', 'pipe-solver-session', [
    ['Session ID', session?.sessionId || 'None'],
    ['Status', session?.status || 'None'],
    ['Version', session?.version ?? 'None'],
    ['Target', session?.targetId || 'None'],
    ['Request ID', session?.requestId || 'None'],
    ['Workspace readiness', stringify(session?.workspaceReadiness)],
    ['Field errors', stringify(session?.fieldErrors)],
    ['Failure', stringify(session?.failure)],
  ]);
}

export function resultSection(documentRef, model) {
  const result = model?.currentResult;
  const section = sectionCard(documentRef, 'Current solver-result-contract-v1 evidence', 'pipe-solver-result');
  if (!result) {
    section.append(paragraph(documentRef, 'No valid completed matching Pipe Solver result is available.'));
    return section;
  }
  section.append(
    definitionList(documentRef, [
      ['Schema', result.schemaVersion],
      ['Module', result.moduleId],
      ['Method', result.methodId],
      ['Engineering level', result.engineeringLevel],
      ['Status', result.status],
      ['Formula IDs', stringify(result.formulaIds)],
      ['Summary', stringify(result.summary)],
    ]),
    pre(documentRef, 'Formula trace', result.formulaTrace),
    pre(documentRef, 'Warnings', result.warnings),
    pre(documentRef, 'Result diagnostics', result.diagnostics),
    pre(documentRef, 'Results', result.results),
  );
  return section;
}

export function ledgerSection(documentRef, model, eligibility) {
  const section = sectionCard(documentRef, 'Matching Pipe Solver analysis ledger history', 'pipe-solver-ledger');
  section.append(table(documentRef,
    ['Sequence','Entry','Target','Status','Method','Result','Warnings','Diagnostics','Failure','Active'],
    (model?.ledgerRows || []).map((row) => [
      row.sequence,
      ledgerButton(documentRef, row, eligibility),
      row.targetId,
      row.status,
      row.methodId || '',
      row.resultStatus || '',
      row.warningCount,
      row.diagnosticCount,
      row.failureMessage || '',
      row.entryId === model.summary.activeMatchingLedgerEntryId ? 'Yes' : 'No',
    ])));
  return section;
}

export function diagnosticsSection(documentRef, model) {
  const section = sectionCard(documentRef, 'Assumptions, limitations and diagnostics', 'pipe-solver-diagnostics');
  section.append(
    pre(documentRef, 'Assumptions', model?.assumptions || []),
    pre(documentRef, 'Limitations', model?.limitations || []),
    pre(documentRef, 'Diagnostics', model?.diagnostics || []),
  );
  return section;
}

function inputCell(documentRef, row, eligibility) {
  const wrapper = documentRef.createElement('div');
  if (row.editable && eligibility.editableFieldKeys.includes(row.key)) {
    const label = documentRef.createElement('label');
    label.textContent = `Override ${row.label}`;
    const input = documentRef.createElement('input');
    input.type = 'text';
    input.dataset.pipeSolverField = row.key;
    input.value = row.overrideValue ?? row.value ?? '';
    input.setAttribute('aria-label', `Override ${row.label}`);
    label.append(input);
    wrapper.append(label);
  } else {
    wrapper.append(documentRef.createTextNode(row.overrideValue == null ? 'Not editable' : String(row.overrideValue)));
  }
  if (row.fieldError) wrapper.append(paragraph(documentRef, row.fieldError));
  return wrapper;
}

function ledgerButton(documentRef, row, eligibility) {
  const button = documentRef.createElement('button');
  button.type = 'button';
  button.textContent = row.entryId;
  button.dataset.pipeSolverLedgerEntry = row.entryId;
  button.setAttribute('aria-disabled', String(!eligibility.selectableLedgerEntryIds.includes(row.entryId)));
  return button;
}

function card(documentRef, title, role, rows) {
  const section = sectionCard(documentRef, title, role);
  section.append(definitionList(documentRef, rows));
  return section;
}

function sectionCard(documentRef, title, role) {
  const section = documentRef.createElement('section');
  section.className = 'pipe-solver-card';
  section.dataset.role = role;
  section.setAttribute('aria-labelledby', `${role}-heading`);
  const heading = documentRef.createElement('h2');
  heading.id = `${role}-heading`;
  heading.textContent = title;
  section.append(heading);
  return section;
}

function definitionList(documentRef, rows) {
  const list = documentRef.createElement('dl');
  rows.forEach(([term, value]) => {
    const wrapper = documentRef.createElement('div');
    const dt = documentRef.createElement('dt');
    const dd = documentRef.createElement('dd');
    dt.textContent = term;
    dd.textContent = valueText(value);
    wrapper.append(dt, dd);
    list.append(wrapper);
  });
  return list;
}

function table(documentRef, headings, rows) {
  const wrap = documentRef.createElement('div');
  wrap.className = 'pipe-solver-table-wrap';
  const tableElement = documentRef.createElement('table');
  const head = documentRef.createElement('thead');
  const headRow = documentRef.createElement('tr');
  headings.forEach((heading) => {
    const th = documentRef.createElement('th');
    th.scope = 'col';
    th.textContent = heading;
    headRow.append(th);
  });
  head.append(headRow);
  const body = documentRef.createElement('tbody');
  rows.forEach((row) => body.append(tableRow(documentRef, row)));
  tableElement.append(head, body);
  wrap.append(tableElement);
  return wrap;
}

function tableRow(documentRef, values) {
  const row = documentRef.createElement('tr');
  values.forEach((value) => {
    const cell = documentRef.createElement('td');
    if (value?.nodeType) cell.append(value);
    else cell.textContent = valueText(value);
    row.append(cell);
  });
  return row;
}

function pre(documentRef, title, value) {
  const wrapper = documentRef.createElement('div');
  const heading = documentRef.createElement('h3');
  const content = documentRef.createElement('code');
  heading.textContent = title;
  content.textContent = stringify(value);
  wrapper.append(heading, content);
  return wrapper;
}

function paragraph(documentRef, text) {
  const element = documentRef.createElement('p');
  element.textContent = text;
  return element;
}

function stringify(value) {
  if (value == null) return '';
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function valueText(value) {
  return value == null || value === '' ? 'None' : String(value);
}

function yesNo(value) {
  return value ? 'Yes' : 'No';
}
