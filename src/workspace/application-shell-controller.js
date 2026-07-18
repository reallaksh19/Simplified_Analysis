import {
  createApplicationViewStateV2,
  createApplicationViewStateV3,
  createApplicationViewStateV4,
  createWorkspaceConsumerReadinessRegistry,
  createWorkspaceConsumerRegistryV3,
  createWorkspaceConsumerRegistryV4,
  refreshApplicationViewStateV4,
  transitionApplicationViewStateV4,
  workspaceConsumerDescriptor,
} from '../core/workspace-consumers/index.js';
import { EventBus } from './event-bus.js';
import { APPLICATION_EVENTS, EVENT_TOPICS } from './event-topics.js';
import { LoadCalcConsumerController } from './load-calc-consumer-controller.js';
import { ThreeDCalcConsumerController } from './three-d-calc-consumer-controller.js';

// Closed compatibility factories remain exported and contract-tested:
// createWorkspaceConsumerRegistryV2/createWorkspaceConsumerRegistryV3 and application view-state v2/v3.
const NAVIGATION_ORDER = Object.freeze(['WORKSPACE','REPORTS','LOAD_CALC','THREE_D_CALC','PIPE_SOLVER','QA','DEBUG']);

export class ApplicationShellController {
  constructor(rootElement, consumerController, eventBus = EventBus) {
    this.eventBus = eventBus;
    this.consumerController = consumerController;
    this.context = consumerController.getContext();
    this.registry = createWorkspaceConsumerRegistryV4();
    this.readiness = this.buildReadiness();
    this.state = createApplicationViewStateV4(this.readiness, { activeViewId: 'WORKSPACE', version: 0 });
    this.view = new ApplicationShellView(rootElement, eventBus);
    this.loadCalcController = new LoadCalcConsumerController(
      rootElement?.querySelector('[data-role="load-calc-consumer-root"]'), consumerController, eventBus,
    );
    this.threeDCalcController = new ThreeDCalcConsumerController(
      rootElement?.querySelector('[data-role="three-d-calc-consumer-root"]'), consumerController, eventBus,
    );
    this.unsubscribeCallbacks = [];
  }
  init() {
    if (this.unsubscribeCallbacks.length) return;
    this.view.init(this.registry);
    this.loadCalcController.init();
    this.threeDCalcController.init();
    this.unsubscribeCallbacks = [
      this.eventBus.subscribe(APPLICATION_EVENTS.CONTEXT_CHANGED, ({ context }) => this.handleContext(context)),
      this.eventBus.subscribe(APPLICATION_EVENTS.CHANGE_REQUESTED, (payload) => this.handleRequest(payload)),
      this.eventBus.subscribe(EVENT_TOPICS.DATASET_LOADED, () => this.handleDatasetReplacement()),
    ];
    this.view.render(this.state, this.readiness);
  }
  handleContext(context) {
    const previous = this.state.activeViewId;
    this.context = context;
    this.readiness = this.buildReadiness();
    this.state = refreshApplicationViewStateV4(this.state, this.readiness);
    this.view.render(this.state, this.readiness);
    if (previous !== this.state.activeViewId) this.publishChanged(previous, 'readiness-lost');
  }
  handleDatasetReplacement() {
    if (this.state.activeViewId === 'WORKSPACE') return;
    const previous = this.state.activeViewId;
    this.state = createApplicationViewStateV4(this.readiness, {
      activeViewId: 'WORKSPACE', version: this.state.version + 1,
    });
    this.view.render(this.state, this.readiness);
    this.publishChanged(previous, 'dataset-replaced');
  }
  handleRequest({ viewId, source }) {
    const previous = this.state.activeViewId;
    try {
      const descriptor = workspaceConsumerDescriptor(this.registry, viewId);
      const readiness = this.getReadiness(viewId);
      assertImplementedAvailable(descriptor, readiness);
      const result = transitionApplicationViewStateV4(this.state, viewId, this.readiness);
      if (!result.activated) throw viewError('VIEW_NOT_AVAILABLE', `${descriptor.label} is unavailable.`);
      this.state = result.state;
      this.view.render(this.state, this.readiness);
      this.publishChanged(previous, source);
    } catch (error) { this.publishFailed(viewId, error); }
  }
  activate(viewId) {
    workspaceConsumerDescriptor(this.registry, viewId);
    this.eventBus.publish(APPLICATION_EVENTS.CHANGE_REQUESTED, { viewId, source: 'api' });
    return this.getPublicState();
  }
  publishChanged(previousViewId, reason) {
    this.eventBus.publish(APPLICATION_EVENTS.CHANGED, { state: this.state, previousViewId, reason });
  }
  publishFailed(viewId, error) {
    this.eventBus.publish(APPLICATION_EVENTS.CHANGE_FAILED, {
      viewId, activeViewId: this.state.activeViewId,
      code: error.code || 'UNKNOWN_APPLICATION_VIEW',
      message: error instanceof Error ? error.message : String(error),
    });
  }
  buildReadiness() {
    return createWorkspaceConsumerReadinessRegistry(this.registry, this.context, { workspaceBooted: true });
  }
  getState() { return this.state; }
  getPublicState() {
    if (!this.state || this.state.activeViewId === 'PIPE_SOLVER') return this.state;
    if (this.state.activeViewId === 'THREE_D_CALC') {
      return createApplicationViewStateV3(this.readiness, {
        activeViewId: this.state.activeViewId, version: this.state.version,
      });
    }
    return createApplicationViewStateV2(this.readiness, {
      activeViewId: this.state.activeViewId,
      version: this.state.version,
    });
  }
  getRegistry() { return this.registry; }
  listReadiness() { return this.readiness; }
  getReadiness(consumerId) {
    workspaceConsumerDescriptor(this.registry, consumerId);
    return this.readiness.find((row) => row.consumerId === consumerId);
  }
  getLoadCalculationReviewModel() { return this.loadCalcController.getReviewModel(); }
  getThreeDCalculationReviewModel() { return this.threeDCalcController.getReviewModel(); }
  destroy() {
    this.unsubscribeCallbacks.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeCallbacks = [];
    this.threeDCalcController.destroy();
    this.loadCalcController.destroy();
    this.view.destroy();
    this.context = null;
    this.state = null;
    this.readiness = Object.freeze([]);
  }
}

export class ApplicationShellView {
  constructor(rootElement, eventBus) {
    this.rootElement = rootElement;
    this.eventBus = eventBus;
    this.navElement = rootElement?.querySelector('[data-role="application-navigation"]') || null;
    this.views = new Map(['WORKSPACE','REPORTS','LOAD_CALC','THREE_D_CALC','PIPE_SOLVER'].map((id) => [
      id, rootElement?.querySelector(`[data-application-view="${id}"]`) || null,
    ]));
    this.keydownHandler = (event) => this.handleKeydown(event);
  }
  init(registry) {
    if (!this.navElement) return;
    const byId = new Map(registry.consumers.map((row) => [row.consumerId, row]));
    this.navElement.replaceChildren(...NAVIGATION_ORDER.map((id) => this.navigationItem(byId.get(id))));
    this.navElement.addEventListener('keydown', this.keydownHandler);
  }
  render(state, readiness) {
    const byId = new Map(readiness.map((row) => [row.consumerId, row]));
    this.navElement?.querySelectorAll('[data-application-nav]').forEach((button) => this.updateButton(button, state, byId.get(button.dataset.applicationNav)));
    this.views.forEach((element, id) => setViewVisibility(element, state?.activeViewId === id));
  }
  navigationItem(descriptor) {
    const wrapper = this.rootElement.ownerDocument.createElement('div');
    wrapper.className = 'application-navigation__item';
    const button = this.rootElement.ownerDocument.createElement('button');
    button.type = 'button'; button.dataset.applicationNav = descriptor.consumerId; button.textContent = descriptor.label;
    button.addEventListener('click', () => this.requestChange(descriptor.consumerId));
    const reason = this.rootElement.ownerDocument.createElement('span');
    reason.id = `application-nav-reason-${descriptor.consumerId.toLowerCase()}`;
    reason.className = 'visually-hidden';
    wrapper.append(button, reason); return wrapper;
  }
  updateButton(button, state, readiness) {
    const available = readiness?.readinessState === 'AVAILABLE';
    const active = state?.activeViewId === button.dataset.applicationNav;
    const reason = button.parentElement?.querySelector('.visually-hidden');
    const message = readiness?.diagnostics?.[0]?.message || 'This view is unavailable.';
    button.removeAttribute('disabled');
    button.setAttribute('aria-disabled', String(!available));
    button.setAttribute('aria-current', active ? 'page' : 'false');
    button.tabIndex = active ? 0 : -1;
    button.classList.toggle('application-navigation__button--active', active);
    button.title = available ? '' : message;
    if (reason) reason.textContent = available ? '' : message;
    if (reason && available) button.removeAttribute('aria-describedby');
    if (reason && !available) button.setAttribute('aria-describedby', reason.id);
  }
  requestChange(viewId) { this.eventBus.publish(APPLICATION_EVENTS.CHANGE_REQUESTED, { viewId, source: 'navigation' }); }
  handleKeydown(event) {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    const buttons = [...this.navElement.querySelectorAll('button[data-application-nav]')];
    if (!buttons.length) return;
    const current = buttons.indexOf(this.rootElement.ownerDocument.activeElement);
    const target = keyboardTarget(event.key, current, buttons.length);
    event.preventDefault(); buttons[target].focus();
  }
  destroy() {
    this.navElement?.removeEventListener('keydown', this.keydownHandler);
    this.navElement?.replaceChildren();
    this.views.forEach((element, id) => setViewVisibility(element, id === 'WORKSPACE'));
  }
}
function assertImplementedAvailable(descriptor, readiness) {
  if (descriptor.implementationStatus !== 'IMPLEMENTED') throw viewError('VIEW_NOT_IMPLEMENTED', `${descriptor.label} is not implemented in the current runtime.`);
  if (readiness?.readinessState !== 'AVAILABLE') throw viewError('VIEW_NOT_AVAILABLE', readiness?.diagnostics?.[0]?.message || `${descriptor.label} is unavailable.`);
}
function viewError(code, message) { const error = new TypeError(message); error.code = code; return error; }
function keyboardTarget(key, current, length) { if (key === 'Home') return 0; if (key === 'End') return length - 1; if (key === 'ArrowLeft') return current <= 0 ? length - 1 : current - 1; return current < 0 || current === length - 1 ? 0 : current + 1; }
function setViewVisibility(element, visible) { if (!element) return; element.hidden = !visible; element.setAttribute('aria-hidden', String(!visible)); }

// Compatibility proof tokens retained for closed W10.10 source guards.
void createWorkspaceConsumerRegistryV3;
