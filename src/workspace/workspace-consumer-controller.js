import {
  CONSUMER_IDS,
  createApplicationViewState,
  createWorkspaceConsumerContext,
  createWorkspaceConsumerReadiness,
  createWorkspaceConsumerRegistry,
} from '../core/workspace-consumers/index.js';

export class WorkspaceConsumerController {
  #bus; #read; #registry; #context; #readiness = {}; #viewState; #unsubscribers = [];

  constructor(eventBus, readers) {
    this.#bus = eventBus;
    this.#read = readers;
    this.#registry = createWorkspaceConsumerRegistry();
  }

  init() {
    this.#rebuild(false);
    ['workspace:snapshotChanged', 'topology:changed', 'supportRestraint:changed', 'modelLoad:changed', 'supportLoadScreening:changed', 'verticalBeam:changed', 'modelCalculation:changed']
      .forEach((topic) => this.#unsubscribers.push(this.#bus.subscribe(topic, () => this.#rebuild(true))));
  }

  destroy() { this.#unsubscribers.splice(0).forEach((off) => off()); this.#context = null; this.#readiness = {}; this.#viewState = null; }
  getContext() { return this.#context; }
  listConsumers() { return this.#registry.consumers; }
  getReadiness(consumerId) {
    if (!CONSUMER_IDS.includes(consumerId)) throw new RangeError(`Unknown workspace consumer: ${consumerId}`);
    return this.#readiness[consumerId];
  }
  getViewState() { return this.#viewState; }
  activate(viewId) {
    if (!['WORKSPACE', 'REPORTS'].includes(viewId)) throw new RangeError(`Unknown application view: ${viewId}`);
    const readiness = this.#readiness[viewId];
    if (readiness.readinessState !== 'AVAILABLE') {
      this.#bus.publish('applicationView:changeFailed', { viewId, activeViewId: this.#viewState.activeViewId, reason: readiness.readinessState });
      return this.#viewState;
    }
    if (this.#viewState.activeViewId !== viewId) {
      this.#viewState = Object.freeze({ ...this.#viewState, activeViewId: viewId, version: this.#viewState.version + 1 });
      this.#bus.publish('applicationView:changed', { viewState: this.#viewState });
    }
    return this.#viewState;
  }

  #rebuild(emit) {
    const snapshot = this.#read.getSnapshot();
    const contracts = Object.fromEntries(Object.entries(this.#read.contractReaders).map(([key, getter]) => [key, getter()]));
    this.#context = createWorkspaceConsumerContext({ datasetId: snapshot.dataset?.datasetId ?? null, workspaceVersion: snapshot.version, selectedEntityId: snapshot.selectedEntityId, contracts });
    this.#readiness = Object.fromEntries(CONSUMER_IDS.map((id) => [id, createWorkspaceConsumerReadiness(this.#registry, this.#context, id)]));
    this.#viewState = createApplicationViewState(this.#readiness, this.#viewState?.activeViewId ?? 'WORKSPACE', this.#viewState?.version ?? 0);
    if (emit) this.#bus.publish('workspaceConsumerContext:changed', { context: this.#context });
  }
}