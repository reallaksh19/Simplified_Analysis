import { normalizeWorkspaceDataset } from './dataset-adapter.js';
import { EventBus } from './event-bus.js';
import { EVENT_TOPICS } from './event-topics.js';
import { WorkspaceState } from './workspace-state.js';

export class DatasetController {
  constructor(eventBus = EventBus, workspaceState = WorkspaceState) {
    this.eventBus = eventBus;
    this.workspaceState = workspaceState;
    this.unsubscribeCallbacks = [];
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.unsubscribeCallbacks = [
      this.eventBus.subscribe(
        EVENT_TOPICS.DATASET_LOAD_REQUESTED,
        (payload) => this.load(payload),
      ),
      this.eventBus.subscribe(
        EVENT_TOPICS.DATASET_CLEAR_REQUESTED,
        () => this.clear(),
      ),
      this.eventBus.subscribe(
        EVENT_TOPICS.VIEWPORT_ENTITY_SELECTED,
        (payload) => this.select(payload.entityId),
      ),
    ];
    this.initialized = true;
  }

  load({ rawPackage, sourceName = '' }) {
    try {
      const dataset = normalizeWorkspaceDataset(rawPackage, sourceName);
      const snapshot = this.workspaceState.loadDataset(dataset);
      this.publishSnapshot(snapshot);
      this.eventBus.publish(EVENT_TOPICS.DATASET_LOADED, {
        datasetId: dataset.datasetId,
        nodeCount: dataset.summary.nodeCount,
      });
    } catch (error) {
      this.eventBus.publish(EVENT_TOPICS.DATASET_LOAD_FAILED, {
        message: error instanceof Error ? error.message : String(error),
        sourceName,
      });
    }
  }

  clear() {
    const snapshot = this.workspaceState.clearDataset();
    this.publishSnapshot(snapshot);
    this.eventBus.publish(EVENT_TOPICS.DATASET_CLEARED, { version: snapshot.version });
  }

  select(entityId) {
    const entity = this.workspaceState.selectEntity(entityId);
    if (!entity) return;
    this.publishSnapshot(this.workspaceState.getSnapshot());
  }

  publishSnapshot(snapshot) {
    this.eventBus.publish(EVENT_TOPICS.WORKSPACE_SNAPSHOT_CHANGED, { snapshot });
  }

  destroy() {
    this.unsubscribeCallbacks.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeCallbacks = [];
    this.initialized = false;
  }
}
