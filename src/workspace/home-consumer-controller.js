import { createWorkspaceHomeReviewModel, createWorkspaceHomeSource } from '../core/workspace-home/index.js';
import { APPLICATION_EVENTS } from './event-topics.js';
import { EventBus } from './event-bus.js';
import { HomeConsumerView } from './home-consumer-view.js';

export class HomeConsumerController {
  constructor(rootElement, sourceProvider, eventBus = EventBus) {
    if (typeof sourceProvider !== 'function') throw new TypeError('Home consumer sourceProvider is required.');
    this.sourceProvider = sourceProvider;
    this.eventBus = eventBus;
    this.view = new HomeConsumerView(rootElement);
    this.source = null;
    this.reviewModel = null;
    this.active = false;
    this.destroyed = false;
    this.pendingToken = 0;
    this.materializationCount = 0;
  }

  init() {
    this.view.init((viewId) => this.eventBus.publish(APPLICATION_EVENTS.CHANGE_REQUESTED, { viewId, source: 'navigation' }));
  }

  open() {
    if (this.destroyed) return;
    this.active = true;
    this.pendingToken += 1;
    this.materialize();
  }

  openDeferred() {
    if (this.destroyed) return;
    this.active = true;
    const token = ++this.pendingToken;
    queueMicrotask(() => {
      if (!this.destroyed && this.active && token === this.pendingToken) this.materialize();
    });
  }

  close() {
    this.active = false;
    this.pendingToken += 1;
  }

  refresh() {
    if (this.active && !this.destroyed) this.materialize();
  }

  materialize() {
    const nextSource = createWorkspaceHomeSource(this.sourceProvider());
    if (this.source?.semanticHash === nextSource.semanticHash && this.reviewModel) return this.reviewModel;
    this.source = nextSource;
    this.reviewModel = createWorkspaceHomeReviewModel(nextSource);
    this.materializationCount += 1;
    this.view.render(this.reviewModel);
    return this.reviewModel;
  }

  getReviewModel() { return this.reviewModel; }
  getMaterializationCount() { return this.materializationCount; }

  destroy() {
    this.destroyed = true;
    this.pendingToken += 1;
    this.view.destroy();
    this.sourceProvider = null;
    this.source = null;
    this.reviewModel = null;
    this.active = false;
    this.materializationCount = 0;
  }
}
