import { flattenProperties } from './property-flattener.js';

export function renderPropertiesContent(documentRef, selection, capabilities, analysisState) {
  const fragment = documentRef.createDocumentFragment();
  fragment.append(renderSelectionHeader(documentRef, selection));
  fragment.append(renderRows(documentRef, selection.properties, 'No properties supplied for this selection.'));
  fragment.append(renderCapabilities(documentRef, capabilities));
  fragment.append(renderAnalysis(documentRef, analysisState));
  return fragment;
}

function renderSelectionHeader(documentRef, selection) {
  const heading = documentRef.createElement('div');
  heading.className = 'properties-selection';
  const label = documentRef.createElement('span');
  label.textContent = 'Selected entity';
  const identity = documentRef.createElement('strong');
  identity.textContent = selection.entityId;
  const type = documentRef.createElement('em');
  type.textContent = selection.entityType;
  heading.append(label, identity, type);
  return heading;
}

function renderCapabilities(documentRef, capabilities) {
  const section = documentRef.createElement('section');
  section.className = 'analysis-capabilities';
  section.dataset.role = 'analysis-capabilities';
  const heading = documentRef.createElement('h3');
  heading.textContent = 'Contextual analysis';
  section.append(heading);

  if (!capabilities.length) {
    const empty = documentRef.createElement('p');
    empty.className = 'panel-empty';
    empty.textContent = 'No registered analysis capability is available for this selection.';
    section.append(empty);
    return section;
  }

  capabilities.forEach((capability) => {
    const card = documentRef.createElement('article');
    card.className = 'analysis-capability';
    const title = documentRef.createElement('strong');
    title.textContent = capability.label;
    const description = documentRef.createElement('p');
    description.textContent = capability.description || capability.engineeringLevel;
    const action = documentRef.createElement('button');
    action.type = 'button';
    action.className = 'analysis-action';
    action.dataset.analysisType = capability.analysisType;
    action.disabled = !capability.enabled;
    action.textContent = `Run contextual analysis · ${capability.label}`;
    card.append(title, description, action);

    if (!capability.enabled) {
      const reason = documentRef.createElement('small');
      reason.className = 'analysis-capability__reason';
      reason.textContent = capability.reason || 'Required engineering inputs are unavailable.';
      card.append(reason);
    }
    section.append(card);
  });
  return section;
}

function renderAnalysis(documentRef, state) {
  const section = documentRef.createElement('section');
  section.className = 'analysis-result';
  section.dataset.role = 'analysis-result';
  const heading = documentRef.createElement('h3');
  heading.textContent = 'Analysis result';
  const status = documentRef.createElement('output');
  status.dataset.role = 'analysis-status';
  status.textContent = analysisStatusText(state);
  section.append(heading, status);

  if (state.status === 'completed') {
    section.append(renderRows(documentRef, {
      summary: state.result.summary,
      results: state.result.results,
      warnings: state.result.warnings,
      diagnostics: state.result.diagnostics,
    }, 'Analysis completed without displayable result fields.', 120));
  }
  if (state.status === 'failed') {
    const error = documentRef.createElement('p');
    error.className = 'analysis-error';
    error.textContent = `${state.code}: ${state.message}`;
    section.append(error);
    if (state.details && Object.keys(state.details).length) {
      section.append(renderRows(documentRef, state.details, '', 40));
    }
  }
  return section;
}

function renderRows(documentRef, value, emptyText, limit = 240) {
  const rows = flattenProperties(value, limit);
  if (!rows.length) {
    const empty = documentRef.createElement('p');
    empty.className = 'panel-empty';
    empty.textContent = emptyText;
    return empty;
  }

  const table = documentRef.createElement('dl');
  table.className = 'properties-grid';
  rows.forEach((row) => {
    const term = documentRef.createElement('dt');
    term.textContent = row.path;
    term.title = row.path;
    const description = documentRef.createElement('dd');
    description.textContent = row.value;
    description.title = row.value;
    table.append(term, description);
  });
  return table;
}

function analysisStatusText(state) {
  if (state.status === 'running') {
    return `Running ${state.analysisType} for ${state.targetId}…`;
  }
  if (state.status === 'completed') {
    return `${state.analysisType} completed · ${state.result.status}`;
  }
  if (state.status === 'failed') {
    return `${state.analysisType} failed`;
  }
  return 'No analysis has been run for this selection.';
}
