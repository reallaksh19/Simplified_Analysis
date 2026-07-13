import { EventBus } from './event-bus.js';
import { EVENT_TOPICS } from './event-topics.js';
import { assessModelSupportLoadReadiness } from './model-support-load-readiness.js';
import { WorkspaceState } from './workspace-state.js';

export class ModelSupportLoadController {
  constructor(eventBus = EventBus, workspaceState = WorkspaceState) {
    this.eventBus = eventBus;
    this.workspaceState = workspaceState;
    this.unsubscribeCallbacks = [];
  }

  init() {
    if (this.unsubscribeCallbacks.length) return;
    this.unsubscribeCallbacks = [
      this.eventBus.subscribe(
        EVENT_TOPICS.WORKSPACE_SNAPSHOT_CHANGED,
        ({ snapshot }) => this.publishReadiness(snapshot),
      ),
      this.eventBus.subscribe(
        EVENT_TOPICS.DATASET_CLEARED,
        () => this.eventBus.publish(EVENT_TOPICS.MODEL_SUPPORT_LOAD_READINESS_CHANGED, { readiness: null }),
      ),
    ];
    this.publishReadiness(this.workspaceState.getSnapshot());
  }

  publishReadiness(snapshot) {
    if (snapshot?.status !== 'ready' || !snapshot.dataset) return;
    try {
      const readiness = assessModelSupportLoadReadiness(snapshot.dataset);
      this.eventBus.publish(EVENT_TOPICS.MODEL_SUPPORT_LOAD_READINESS_CHANGED, { readiness });
    } catch (error) {
      this.eventBus.publish(EVENT_TOPICS.MODEL_SUPPORT_LOAD_READINESS_CHANGED, {
        readiness: null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  destroy() {
    this.unsubscribeCallbacks.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeCallbacks = [];
  }
}
