import { EventBus } from './event-bus.js';
import { EVENT_TOPICS } from './event-topics.js';
import { flattenProperties } from './property-flattener.js';
import { WorkspaceState } from './workspace-state.js';

export class PropertiesPanel {
  constructor(rootElement, eventBus = EventBus, workspaceState = WorkspaceState) {
    if (!rootElement) throw new TypeError('PropertiesPanel requires a root element.');
    this.rootElement = rootElement;
    this.eventBus = eventBus;
    this.workspaceState = workspaceState;
    this.selection = null;
    this.unsubscribeCallbacks = [];
    this.handleClick = this.handleClick.bind(this);
  }

  init() {
    if (this.unsubscribeCallbacks.length) return;
    this.contentElement = this.rootElement.querySelector('[data-role="properties-content"]');
    if (!this.contentElement) throw new Error('PropertiesPanel content root is missing.');

    this.rootElement.addEventListener('click', this.handleClick);
    this.unsubscribeCallbacks = [
      this.eventBus.subscribe(
        EVENT_TOPICS.VIEWPORT_ENTITY_SELECTED,
        (payload) => this.renderSelection(payload),
      ),
      this.eventBus.subscribe(
        EVENT_TOPICS.DATASET_CLEARED,
        () => this.renderEmpty(),
      ),
    ];
  }

  renderSelection(payload = {}) {
    const stateEntity = this.workspaceState.getEntity(payload.entityId);
    const selection = stateEntity
      ? {
          entityId: stateEntity.entityId,
          type: stateEntity.selectionType,
          entityType: stateEntity.entityType,
          properties: stateEntity.properties,
        }
      : {
          entityId: String(payload.entityId ?? 'Unknown entity'),
          type: String(payload.type ?? 'unclassified'),
          entityType: String(payload.type ?? 'unclassified'),
          properties: isPlainObject(payload.properties) ? payload.properties : {},
        };

    this.selection = selection;
    this.render(selection);
  }

  render(selection) {
    const documentRef = this.rootElement.ownerDocument;
    const fragment = documentRef.createDocumentFragment();

    const heading = documentRef.createElement('div');
    heading.className = 'properties-selection';
    const headingLabel = documentRef.createElement('span');
    headingLabel.textContent = 'Selected entity';
    const headingIdentity = documentRef.createElement('strong');
    headingIdentity.textContent = selection.entityId;
    const headingType = documentRef.createElement('em');
    headingType.textContent = selection.entityType;
    heading.append(headingLabel, headingIdentity, headingType);
    fragment.append(heading);

    const rows = flattenProperties(selection.properties);
    if (!rows.length) {
      const empty = documentRef.createElement('p');
      empty.className = 'panel-empty';
      empty.textContent = 'No properties supplied for this selection.';
      fragment.append(empty);
    } else {
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
      fragment.append(table);
    }

    const action = documentRef.createElement('button');
    action.type = 'button';
    action.className = 'analysis-action';
    action.dataset.action = 'request-analysis';
    action.textContent = 'Run contextual analysis';
    fragment.append(action);
    this.contentElement.replaceChildren(fragment);
  }

  handleClick(event) {
    const action = event.target?.closest?.('[data-action="request-analysis"]');
    if (!action || !this.rootElement.contains(action) || !this.selection) return;
    this.eventBus.publish(EVENT_TOPICS.ANALYSIS_REQUESTED, {
      analysisType: this.selection.type === 'support' ? 'support-load' : 'pipe-screening',
      targetId: this.selection.entityId,
    });
  }

  renderEmpty() {
    this.selection = null;
    const empty = this.rootElement.ownerDocument.createElement('p');
    empty.className = 'panel-empty';
    empty.textContent = 'Select a pipe or support to inspect its properties.';
    this.contentElement.replaceChildren(empty);
  }

  destroy() {
    this.rootElement.removeEventListener('click', this.handleClick);
    this.unsubscribeCallbacks.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeCallbacks = [];
    this.selection = null;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
