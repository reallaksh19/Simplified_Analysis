import { EventBus } from './event-bus.js';
import { EVENT_TOPICS } from './event-topics.js';

export class PropertiesPanel {
  constructor(rootElement, eventBus = EventBus) {
    if (!rootElement) throw new TypeError('PropertiesPanel requires a root element.');

    this.rootElement = rootElement;
    this.eventBus = eventBus;
    this.selection = null;
    this.unsubscribe = null;
    this.handleClick = this.handleClick.bind(this);
  }

  init() {
    if (this.unsubscribe) return;

    this.contentElement = this.rootElement.querySelector('[data-role="properties-content"]');
    if (!this.contentElement) throw new Error('PropertiesPanel content root is missing.');

    this.rootElement.addEventListener('click', this.handleClick);
    this.unsubscribe = this.eventBus.subscribe(
      EVENT_TOPICS.VIEWPORT_ENTITY_SELECTED,
      this.render.bind(this),
    );
  }

  render(payload = {}) {
    const entityId = String(payload.entityId ?? 'Unknown entity');
    const type = String(payload.type ?? 'unclassified');
    const properties = isPlainObject(payload.properties) ? payload.properties : {};
    const documentRef = this.rootElement.ownerDocument;

    this.selection = { entityId, type, properties };

    const fragment = documentRef.createDocumentFragment();
    const heading = documentRef.createElement('div');
    heading.className = 'properties-selection';
    const headingLabel = documentRef.createElement('span');
    headingLabel.textContent = 'Selected entity';
    const headingIdentity = documentRef.createElement('strong');
    headingIdentity.textContent = entityId;
    const headingType = documentRef.createElement('em');
    headingType.textContent = type;
    heading.append(headingLabel, headingIdentity, headingType);
    fragment.append(heading);

    const table = documentRef.createElement('dl');
    table.className = 'properties-grid';
    const entries = Object.entries(properties);

    if (entries.length === 0) {
      const empty = documentRef.createElement('p');
      empty.className = 'panel-empty';
      empty.textContent = 'No properties supplied for this selection.';
      fragment.append(empty);
    } else {
      entries.forEach(([key, value]) => {
        const term = documentRef.createElement('dt');
        term.textContent = key;
        const description = documentRef.createElement('dd');
        description.textContent = formatValue(value);
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
    const action = event.target.closest('[data-action="request-analysis"]');
    if (!action || !this.rootElement.contains(action) || !this.selection) return;

    this.eventBus.publish(EVENT_TOPICS.ANALYSIS_REQUESTED, {
      analysisType: this.selection.type === 'support' ? 'support-load' : 'pipe-screening',
      targetId: this.selection.entityId,
    });
  }

  destroy() {
    this.rootElement.removeEventListener('click', this.handleClick);
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.selection = null;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function formatValue(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
