import { EventBus } from './event-bus.js';
import { EVENT_TOPICS } from './event-topics.js';

export class ViewportPanel {
  constructor(rootElement, eventBus = EventBus) {
    if (!rootElement) throw new TypeError('ViewportPanel requires a root element.');

    this.rootElement = rootElement;
    this.eventBus = eventBus;
    this.unsubscribers = [];
  }

  init() {
    if (this.unsubscribers.length > 0) return;

    this.statusElement = this.rootElement.querySelector('[data-role="viewport-status"]');
    this.selectionElement = this.rootElement.querySelector('[data-role="viewport-selection"]');
    if (!this.statusElement || !this.selectionElement) {
      throw new Error('ViewportPanel status roots are missing.');
    }

    this.unsubscribers = [
      this.eventBus.subscribe(EVENT_TOPICS.DATASET_LOADED, (payload) => {
        this.statusElement.textContent = `${payload.datasetId} · ${payload.nodeCount} nodes`;
      }),
      this.eventBus.subscribe(EVENT_TOPICS.VIEWPORT_ENTITY_SELECTED, (payload) => {
        this.selectionElement.textContent = `Selection: ${payload.entityId ?? 'Unknown'}`;
      }),
      this.eventBus.subscribe(EVENT_TOPICS.ANALYSIS_REQUESTED, (payload) => {
        this.selectionElement.textContent = `Requested: ${payload.analysisType} · ${payload.targetId}`;
      }),
    ];
  }

  destroy() {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
  }
}
