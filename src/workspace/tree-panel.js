import { EventBus } from './event-bus.js';
import { EVENT_TOPICS } from './event-topics.js';

const MOCK_ENTITIES = Object.freeze([
  Object.freeze({
    entityId: 'PIPE-101',
    type: 'pipe',
    label: 'Process Pipe 101',
    properties: Object.freeze({ material: 'Carbon Steel', nominalSize: 'DN150', schedule: '40' }),
  }),
  Object.freeze({
    entityId: 'PIPE-102',
    type: 'pipe',
    label: 'Process Pipe 102',
    properties: Object.freeze({ material: 'Stainless Steel', nominalSize: 'DN100', schedule: '10S' }),
  }),
  Object.freeze({
    entityId: 'SUP-201',
    type: 'support',
    label: 'Guide Support 201',
    properties: Object.freeze({ supportType: 'Guide', lineId: 'PIPE-102', gapMm: 5 }),
  }),
]);

export class TreePanel {
  constructor(rootElement, eventBus = EventBus, entities = MOCK_ENTITIES) {
    if (!rootElement) throw new TypeError('TreePanel requires a root element.');

    this.rootElement = rootElement;
    this.eventBus = eventBus;
    this.entities = new Map(entities.map((entity) => [entity.entityId, entity]));
    this.handleClick = this.handleClick.bind(this);
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    this.listElement = this.rootElement.querySelector('[data-role="tree-list"]');
    if (!this.listElement) throw new Error('TreePanel list root is missing.');

    this.render();
    this.rootElement.addEventListener('click', this.handleClick);
    this.initialized = true;
  }

  render() {
    const documentRef = this.rootElement.ownerDocument;
    const fragment = documentRef.createDocumentFragment();

    this.entities.forEach((entity) => {
      const button = documentRef.createElement('button');
      button.type = 'button';
      button.className = 'tree-entity';
      button.dataset.entityId = entity.entityId;
      button.setAttribute('aria-label', `Select ${entity.label}`);

      const identity = documentRef.createElement('span');
      identity.className = 'tree-entity__identity';
      identity.textContent = entity.label;

      const type = documentRef.createElement('span');
      type.className = 'tree-entity__type';
      type.textContent = entity.type;

      button.append(identity, type);
      fragment.append(button);
    });

    this.listElement.replaceChildren(fragment);
  }

  handleClick(event) {
    const trigger = event.target.closest('[data-entity-id]');
    if (!trigger || !this.rootElement.contains(trigger)) return;

    const entity = this.entities.get(trigger.dataset.entityId);
    if (!entity) return;

    this.eventBus.publish(EVENT_TOPICS.VIEWPORT_ENTITY_SELECTED, {
      entityId: entity.entityId,
      type: entity.type,
      properties: { ...entity.properties },
    });
  }

  destroy() {
    if (!this.initialized) return;
    this.rootElement.removeEventListener('click', this.handleClick);
    this.initialized = false;
  }
}
