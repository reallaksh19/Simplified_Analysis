import {
  createLoadCalculationReviewModel,
  validateLoadCalculationReviewModel,
} from '../core/load-calculation-consumer/index.js';
import { EventBus } from './event-bus.js';
import { APPLICATION_EVENTS } from './event-topics.js';
import { MODEL_LOAD_EVENTS } from './model-load-events.js';
import { SUPPORT_LOAD_SCREENING_EVENTS } from './support-load-screening-events.js';
import { renderLoadCalcConsumer } from './load-calc-consumer-view.js';

export class LoadCalcConsumerController {
  constructor(rootElement, consumerController, eventBus = EventBus) {
    this.rootElement = rootElement;
    this.consumerController = consumerController;
    this.eventBus = eventBus;
    this.context = consumerController?.getContext() || null;
    this.reviewModel = buildReviewModel(this.context);
    this.status = {};
    this.unsubscribeCallbacks = [];
  }
  init() {
    if (this.unsubscribeCallbacks.length) return;
    this.unsubscribeCallbacks = [
      this.eventBus.subscribe(APPLICATION_EVENTS.CONTEXT_CHANGED, ({ context }) => this.handleContext(context)),
      this.eventBus.subscribe(MODEL_LOAD_EVENTS.CHANGED, ({ reason }) => this.handleChanged(reason, 'Model-load evidence updated.')),
      this.eventBus.subscribe(MODEL_LOAD_EVENTS.REBUILD_FAILED, ({ message }) => this.handleFailure(message)),
      this.eventBus.subscribe(MODEL_LOAD_EVENTS.EXPORT_COMPLETED, ({ artifact }) => this.handleExport(artifact)),
      this.eventBus.subscribe(MODEL_LOAD_EVENTS.EXPORT_FAILED, ({ message }) => this.handleFailure(message)),
      this.eventBus.subscribe(SUPPORT_LOAD_SCREENING_EVENTS.CHANGED, ({ reason }) => this.handleChanged(reason, 'Tributary-screening evidence updated.')),
      this.eventBus.subscribe(SUPPORT_LOAD_SCREENING_EVENTS.PATH_REBUILD_FAILED, ({ message }) => this.handleFailure(message)),
      this.eventBus.subscribe(SUPPORT_LOAD_SCREENING_EVENTS.RUN_FAILED, ({ message }) => this.handleFailure(message)),
      this.eventBus.subscribe(SUPPORT_LOAD_SCREENING_EVENTS.EXPORT_COMPLETED, ({ artifact }) => this.handleExport(artifact)),
      this.eventBus.subscribe(SUPPORT_LOAD_SCREENING_EVENTS.EXPORT_FAILED, ({ message }) => this.handleFailure(message)),
    ];
    this.render();
  }
  handleContext(context) {
    this.context = context;
    this.reviewModel = buildReviewModel(context);
    this.render();
  }
  handleChanged(reason, fallback) {
    if (reason === 'explicit' || reason === 'screened') this.status = { message: fallback };
    this.render();
  }
  handleFailure(message) { this.status = { message: message || 'Load Calc action failed.' }; this.render(); }
  handleExport(artifact) { this.status = { message: `Exported ${artifact.filename}` }; this.render(); }
  render() {
    if (!this.rootElement) return;
    const view = renderLoadCalcConsumer(this.rootElement.ownerDocument, this.reviewModel, this.status);
    this.rootElement.replaceChildren(view);
    bind(view, 'rebuild-model-loads', () => this.publish(MODEL_LOAD_EVENTS.REBUILD_REQUESTED));
    bind(view, 'export-model-loads', () => this.publish(MODEL_LOAD_EVENTS.EXPORT_REQUESTED));
    bind(view, 'rebuild-paths', () => this.publish(SUPPORT_LOAD_SCREENING_EVENTS.REBUILD_PATHS_REQUESTED));
    bind(view, 'run-screening', () => this.publish(SUPPORT_LOAD_SCREENING_EVENTS.RUN_REQUESTED));
    bind(view, 'export-screening', () => this.publishScreeningExport(view));
  }
  publish(topic) {
    if (!this.reviewModel) return this.handleFailure('Complete validated W10.4 evidence is required.');
    this.eventBus.publish(topic, {});
  }
  publishScreeningExport(view) {
    const button = view.querySelector('[data-load-calc-action="export-screening"]');
    if (!this.reviewModel?.summary.screeningIncluded || button?.getAttribute('aria-disabled') === 'true') {
      return this.handleFailure('Complete linked W10.5 screening evidence is required for export.');
    }
    this.eventBus.publish(SUPPORT_LOAD_SCREENING_EVENTS.EXPORT_REQUESTED, {});
  }
  getReviewModel() {
    return validateLoadCalculationReviewModel(this.reviewModel).ok ? this.reviewModel : null;
  }
  destroy() {
    this.unsubscribeCallbacks.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeCallbacks = [];
    this.context = null;
    this.reviewModel = null;
    this.consumerController = null;
    this.status = {};
    this.rootElement?.replaceChildren();
  }
}

function buildReviewModel(context) {
  try { return context ? createLoadCalculationReviewModel(context) : null; }
  catch { return null; }
}
function bind(view, action, callback) {
  view.querySelector(`[data-load-calc-action="${action}"]`)?.addEventListener('click', callback);
}
