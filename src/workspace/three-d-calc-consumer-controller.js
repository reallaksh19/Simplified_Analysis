import {
  assessThreeDCalculationActions,
  createThreeDCalculationReviewModel,
  validateThreeDCalculationReviewModel,
} from '../core/three-d-calculation-consumer/index.js';
import { EventBus } from './event-bus.js';
import { APPLICATION_EVENTS } from './event-topics.js';
import { SHARED_MODEL_EVENTS } from './shared-model-events.js';
import { TOPOLOGY_EVENTS } from './topology-events.js';
import { SUPPORT_RESTRAINT_EVENTS } from './support-restraint-events.js';
import { VERTICAL_BEAM_EVENTS } from './vertical-beam-events.js';
import { renderThreeDCalcConsumer } from './three-d-calc-consumer-view.js';

const ACTIONS = Object.freeze({
  'export-shared-model': ['EXPORT_SHARED_MODEL', SHARED_MODEL_EVENTS.EXPORT_REQUESTED],
  'rebuild-topology': ['REBUILD_TOPOLOGY_EXACT', TOPOLOGY_EVENTS.REBUILD_EXACT_REQUESTED],
  'export-topology': ['EXPORT_TOPOLOGY', TOPOLOGY_EVENTS.EXPORT_REQUESTED],
  'rebuild-supports': ['REBUILD_SUPPORT_EVIDENCE', SUPPORT_RESTRAINT_EVENTS.REBUILD_EVIDENCE_REQUESTED],
  'export-supports': ['EXPORT_SUPPORT_RESTRAINT', SUPPORT_RESTRAINT_EVENTS.EXPORT_REQUESTED],
  'rebuild-beam': ['REBUILD_VERTICAL_BEAM_MODEL', VERTICAL_BEAM_EVENTS.REBUILD_REQUESTED],
  'solve-beam': ['SOLVE_VERTICAL_BEAM', VERTICAL_BEAM_EVENTS.SOLVE_REQUESTED],
  'export-beam': ['EXPORT_VERTICAL_BEAM', VERTICAL_BEAM_EVENTS.EXPORT_REQUESTED],
});

export class ThreeDCalcConsumerController {
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
      ...statusSubscriptions(this),
    ];
    this.render();
  }
  handleContext(context) {
    this.context = context;
    this.reviewModel = buildReviewModel(context);
    this.render();
  }
  handleChanged(message) { this.status = { message }; this.render(); }
  handleFailure(message) { this.status = { message: message || '3D Calc action failed.' }; this.render(); }
  handleExport(artifact) { this.status = { message: `Exported ${artifact.filename}` }; this.render(); }
  publish(actionName) {
    const [eligibilityKey, topic] = ACTIONS[actionName] || [];
    const eligibility = assessThreeDCalculationActions(this.reviewModel);
    if (!topic || !eligibility[eligibilityKey]) return this.handleFailure('The selected action is unavailable for the current exact evidence.');
    this.eventBus.publish(topic, {});
  }
  render() {
    if (!this.rootElement) return;
    const eligibility = assessThreeDCalculationActions(this.reviewModel);
    const view = renderThreeDCalcConsumer(this.rootElement.ownerDocument, this.reviewModel, eligibility, this.status);
    this.rootElement.replaceChildren(view);
    Object.keys(ACTIONS).forEach((action) => bind(view, action, () => this.publish(action)));
  }
  getReviewModel() {
    return validateThreeDCalculationReviewModel(this.reviewModel).ok ? this.reviewModel : null;
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

function statusSubscriptions(controller) {
  const bus = controller.eventBus;
  return [
    bus.subscribe(SHARED_MODEL_EVENTS.EXPORT_COMPLETED, ({ artifact }) => controller.handleExport(artifact)),
    bus.subscribe(SHARED_MODEL_EVENTS.EXPORT_FAILED, ({ message }) => controller.handleFailure(message)),
    bus.subscribe(TOPOLOGY_EVENTS.CHANGED, () => controller.handleChanged('Exact topology evidence updated.')),
    bus.subscribe(TOPOLOGY_EVENTS.REBUILD_FAILED, ({ message }) => controller.handleFailure(message)),
    bus.subscribe(TOPOLOGY_EVENTS.EXPORT_COMPLETED, ({ artifact }) => controller.handleExport(artifact)),
    bus.subscribe(TOPOLOGY_EVENTS.EXPORT_FAILED, ({ message }) => controller.handleFailure(message)),
    bus.subscribe(SUPPORT_RESTRAINT_EVENTS.CHANGED, () => controller.handleChanged('Support/restraint evidence updated.')),
    bus.subscribe(SUPPORT_RESTRAINT_EVENTS.REBUILD_FAILED, ({ message }) => controller.handleFailure(message)),
    bus.subscribe(SUPPORT_RESTRAINT_EVENTS.EXPORT_COMPLETED, ({ artifact }) => controller.handleExport(artifact)),
    bus.subscribe(SUPPORT_RESTRAINT_EVENTS.EXPORT_FAILED, ({ message }) => controller.handleFailure(message)),
    bus.subscribe(VERTICAL_BEAM_EVENTS.CHANGED, () => controller.handleChanged('Vertical-beam evidence updated.')),
    bus.subscribe(VERTICAL_BEAM_EVENTS.REBUILD_FAILED, ({ message }) => controller.handleFailure(message)),
    bus.subscribe(VERTICAL_BEAM_EVENTS.SOLVE_FAILED, ({ message }) => controller.handleFailure(message)),
    bus.subscribe(VERTICAL_BEAM_EVENTS.EXPORT_COMPLETED, ({ artifact }) => controller.handleExport(artifact)),
    bus.subscribe(VERTICAL_BEAM_EVENTS.EXPORT_FAILED, ({ message }) => controller.handleFailure(message)),
  ];
}
function buildReviewModel(context) { try { return context ? createThreeDCalculationReviewModel(context) : null; } catch { return null; } }
function bind(view, action, callback) { view.querySelector(`[data-three-d-calc-action="${action}"]`)?.addEventListener('click', callback); }
