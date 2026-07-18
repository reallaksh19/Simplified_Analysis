import {
  PIPE_SCREENING_ANALYSIS_TYPE,
  assessPipeSolverActions,
  canExportPipeSolverLedger,
  canSelectPipeSolverLedgerEntry,
  canUpdatePipeSolverField,
  createPipeSolverReviewModel,
  validatePipeSolverReviewModel,
} from '../core/pipe-solver-consumer/index.js';
import { EventBus } from './event-bus.js';
import { APPLICATION_EVENTS, EVENT_TOPICS } from './event-topics.js';
import { createPipeSolverConsumerSourceFromWorkspace } from './pipe-solver-consumer-source-adapter.js';
import { renderPipeSolverConsumer } from './pipe-solver-consumer-view.js';

export class PipeSolverConsumerController {
  constructor(rootElement, consumerController, dependencies, eventBus = EventBus) {
    this.rootElement = rootElement;
    this.consumerController = consumerController;
    this.dependencies = dependencies;
    this.eventBus = eventBus;
    this.context = consumerController?.getContext() || null;
    this.reviewModel = this.buildModel();
    this.active = false;
    this.status = {};
    this.unsubscribeCallbacks = [];
  }

  init() {
    if (this.unsubscribeCallbacks.length) return;
    this.unsubscribeCallbacks = [
      this.eventBus.subscribe(APPLICATION_EVENTS.CONTEXT_CHANGED, ({ context }) => this.handleContext(context)),
      this.eventBus.subscribe(APPLICATION_EVENTS.CHANGED, ({ state }) => this.handleViewState(state)),
      this.eventBus.subscribe(EVENT_TOPICS.ANALYSIS_SESSION_CHANGED, () => this.refresh('Input review updated.')),
      this.eventBus.subscribe(EVENT_TOPICS.ANALYSIS_LEDGER_CHANGED, () => this.refresh('Analysis ledger updated.')),
      this.eventBus.subscribe(EVENT_TOPICS.ANALYSIS_STARTED, () => this.refresh('Pipe screening is running.')),
      this.eventBus.subscribe(EVENT_TOPICS.ANALYSIS_COMPLETED, () => this.refresh('Pipe screening completed.')),
      this.eventBus.subscribe(EVENT_TOPICS.ANALYSIS_FAILED, ({ message }) => this.refresh(message)),
      this.eventBus.subscribe(EVENT_TOPICS.ANALYSIS_EXPORT_COMPLETED, ({ artifact }) => this.refresh(`Exported ${artifact.filename}`)),
      this.eventBus.subscribe(EVENT_TOPICS.ANALYSIS_EXPORT_FAILED, ({ message }) => this.refresh(message)),
    ];
    this.render();
  }

  handleContext(context) {
    this.context = context;
    this.reviewModel = this.buildModel();
    this.render();
  }

  handleViewState(state) {
    const active = state?.activeViewId === 'PIPE_SOLVER';
    if (this.active === active) return;
    this.active = active;
    this.render();
  }

  refresh(message = '') {
    this.reviewModel = this.buildModel();
    this.status = message ? { message } : this.status;
    this.render();
  }

  publish(action, data = {}) {
    const model = this.reviewModel;
    const eligibility = assessPipeSolverActions(model);
    if (action === 'open' && eligibility.OPEN_PIPE_SCREENING_SESSION) {
      return this.emit(EVENT_TOPICS.ANALYSIS_SESSION_OPEN_REQUESTED,
        { analysisType: PIPE_SCREENING_ANALYSIS_TYPE, targetId: model.selection.entityId });
    }
    if (action === 'override' && canUpdatePipeSolverField(model, data.fieldKey)) {
      return this.emit(EVENT_TOPICS.ANALYSIS_SESSION_OVERRIDE_REQUESTED,
        { sessionId: model.sessionSummary.sessionId, fieldKey: data.fieldKey, value: data.value });
    }
    if (action === 'reset' && eligibility.RESET_PIPE_SCREENING_SESSION) {
      return this.emit(EVENT_TOPICS.ANALYSIS_SESSION_RESET_REQUESTED,
        { sessionId: model.sessionSummary.sessionId });
    }
    if (action === 'run' && eligibility.RUN_PIPE_SCREENING) {
      return this.emit(EVENT_TOPICS.ANALYSIS_REQUESTED, {
        analysisType: PIPE_SCREENING_ANALYSIS_TYPE,
        targetId: model.selection.entityId,
        sessionId: model.sessionSummary.sessionId,
      });
    }
    if (action === 'close' && eligibility.CLOSE_PIPE_SCREENING_SESSION) {
      return this.emit(EVENT_TOPICS.ANALYSIS_SESSION_CLOSE_REQUESTED, {});
    }
    if (action === 'select-ledger' && canSelectPipeSolverLedgerEntry(model, data.entryId)) {
      return this.emit(EVENT_TOPICS.ANALYSIS_LEDGER_ACTIVE_REQUESTED, { entryId: data.entryId });
    }
    if (action === 'export' && canExportPipeSolverLedger(model, data.format)) {
      return this.emit(EVENT_TOPICS.ANALYSIS_EXPORT_REQUESTED, { format: data.format });
    }
    this.status = { message: 'The selected Pipe Solver action is unavailable for the current exact evidence.' };
    this.render();
  }

  emit(topic, payload) {
    this.eventBus.publish(topic, payload);
    return true;
  }

  render() {
    if (!this.rootElement) return;
    if (!this.active) {
      this.rootElement.replaceChildren();
      return;
    }
    const view = renderPipeSolverConsumer(
      this.rootElement.ownerDocument,
      this.reviewModel,
      assessPipeSolverActions(this.reviewModel),
      this.status,
    );
    this.rootElement.replaceChildren(view);
    bindActions(view, this);
  }

  getReviewModel() {
    return validatePipeSolverReviewModel(this.reviewModel).ok ? this.reviewModel : null;
  }

  buildModel() {
    try {
      if (!this.context) return null;
      const source = createPipeSolverConsumerSourceFromWorkspace({
        sourceContext: this.context,
        ...this.dependencies,
      });
      return createPipeSolverReviewModel(source);
    } catch {
      return null;
    }
  }

  destroy() {
    this.unsubscribeCallbacks.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeCallbacks = [];
    this.rootElement?.replaceChildren();
    this.consumerController = null;
    this.dependencies = null;
    this.context = null;
    this.reviewModel = null;
    this.active = false;
    this.status = {};
  }
}

function bindActions(view, controller) {
  view.querySelector('[data-pipe-solver-action="open"]')?.addEventListener('click', () => controller.publish('open'));
  view.querySelector('[data-pipe-solver-action="reset"]')?.addEventListener('click', () => controller.publish('reset'));
  view.querySelector('[data-pipe-solver-action="run"]')?.addEventListener('click', () => controller.publish('run'));
  view.querySelector('[data-pipe-solver-action="close"]')?.addEventListener('click', () => controller.publish('close'));
  view.querySelectorAll('[data-pipe-solver-field]').forEach((input) => input.addEventListener('change', () => (
    controller.publish('override', { fieldKey: input.dataset.pipeSolverField, value: input.value })
  )));
  view.querySelectorAll('[data-pipe-solver-ledger-entry]').forEach((button) => button.addEventListener('click', () => (
    controller.publish('select-ledger', { entryId: button.dataset.pipeSolverLedgerEntry })
  )));
  view.querySelectorAll('[data-pipe-solver-export]').forEach((button) => button.addEventListener('click', () => (
    controller.publish('export', { format: button.dataset.pipeSolverExport })
  )));
}
