import {
  assessPipeSolverActions,
  createPipeSolverReviewModel,
  PIPE_SCREENING_ANALYSIS_TYPE,
  PIPE_SOLVER_ACTIONS,
  validatePipeSolverReviewModel,
} from '../core/pipe-solver-consumer/index.js';
import { EventBus } from './event-bus.js';
import { APPLICATION_EVENTS, EVENT_TOPICS } from './event-topics.js';
import { renderPipeSolverConsumer } from './pipe-solver-consumer-view.js';

export class PipeSolverConsumerController {
  constructor(rootElement, consumerController, sourceAdapter, eventBus = EventBus) {
    if (!sourceAdapter || typeof sourceAdapter.createSource !== 'function') {
      throw new TypeError('PipeSolverConsumerController requires an injected source adapter.');
    }
    this.rootElement = rootElement;
    this.consumerController = consumerController;
    this.sourceAdapter = sourceAdapter;
    this.eventBus = eventBus;
    this.context = consumerController?.getContext() || null;
    this.reviewModel = null;
    this.modelDirty = true;
    this.status = {};
    this.active = false;
    this.unsubscribeCallbacks = [];
  }

  init() {
    if (this.unsubscribeCallbacks.length) return;
    this.unsubscribeCallbacks = [
      this.eventBus.subscribe(APPLICATION_EVENTS.CONTEXT_CHANGED, ({ context }) => this.handleContext(context)),
      this.eventBus.subscribe(APPLICATION_EVENTS.CHANGED, ({ state }) => this.handleViewState(state)),
      this.eventBus.subscribe(EVENT_TOPICS.ANALYSIS_SESSION_CHANGED, () => this.refresh()),
      this.eventBus.subscribe(EVENT_TOPICS.ANALYSIS_LEDGER_CHANGED, () => this.refresh()),
      this.eventBus.subscribe(EVENT_TOPICS.ANALYSIS_COMPLETED, ({ analysisType }) => this.handleLifecycle(analysisType, 'Pipe screening completed.')),
      this.eventBus.subscribe(EVENT_TOPICS.ANALYSIS_FAILED, ({ analysisType, message }) => this.handleLifecycle(analysisType, message)),
      this.eventBus.subscribe(EVENT_TOPICS.ANALYSIS_EXPORT_COMPLETED, ({ artifact }) => this.handleStatus(`Exported ${artifact.filename}.`)),
      this.eventBus.subscribe(EVENT_TOPICS.ANALYSIS_EXPORT_FAILED, ({ message }) => this.handleStatus(message)),
    ];
    this.render();
  }

  handleContext(context) {
    this.context = context;
    this.markModelDirty();
    if (this.active) this.refreshActiveView();
  }

  handleViewState(state) {
    const active = state?.activeViewId === 'PIPE_SOLVER';
    if (this.active === active) return;
    this.active = active;
    if (active) this.ensureModel();
    this.render();
  }

  handleLifecycle(analysisType, message) {
    if (analysisType !== PIPE_SCREENING_ANALYSIS_TYPE) return;
    this.handleStatus(message);
  }

  handleStatus(message) {
    this.status = { message: String(message || '') };
    this.refresh();
  }

  refresh() {
    this.context = this.consumerController?.getContext() || this.context;
    this.markModelDirty();
    if (this.active) this.refreshActiveView();
  }

  publish(action, request = {}) {
    this.refreshModelOnly();
    const eligibility = assessPipeSolverActions(this.reviewModel, request);
    if (!eligibility[action]) return this.handleStatus('The requested Pipe Solver action is unavailable for current evidence.');
    const publication = eventPublication(action, this.reviewModel, request);
    if (!publication) return this.handleStatus('The requested Pipe Solver action is unsupported.');
    this.eventBus.publish(publication.topic, publication.payload);
  }

  render() {
    if (!this.rootElement) return;
    if (!this.active) {
      this.rootElement.replaceChildren();
      return;
    }
    const eligibility = assessPipeSolverActions(this.reviewModel);
    const view = renderPipeSolverConsumer(
      this.rootElement.ownerDocument,
      this.reviewModel,
      eligibility,
      this.status,
    );
    this.rootElement.replaceChildren(view);
    bindActions(view, this);
  }

  getReviewModel() {
    this.ensureModel();
    return validatePipeSolverReviewModel(this.reviewModel).ok ? this.reviewModel : null;
  }

  buildModel() {
    try {
      const source = this.context ? this.sourceAdapter.createSource(this.context) : null;
      return source ? createPipeSolverReviewModel(source) : null;
    } catch {
      return null;
    }
  }

  refreshModelOnly() {
    this.context = this.consumerController?.getContext() || this.context;
    this.markModelDirty();
    this.ensureModel();
  }

  markModelDirty() {
    this.modelDirty = true;
  }

  ensureModel() {
    if (!this.modelDirty) return this.reviewModel;
    this.reviewModel = this.buildModel();
    this.modelDirty = false;
    return this.reviewModel;
  }

  refreshActiveView() {
    this.ensureModel();
    this.render();
  }

  destroy() {
    this.unsubscribeCallbacks.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeCallbacks = [];
    this.rootElement?.replaceChildren();
    this.consumerController = null;
    this.sourceAdapter = null;
    this.context = null;
    this.reviewModel = null;
    this.modelDirty = true;
    this.status = {};
    this.active = false;
  }
}

function eventPublication(action, model, request) {
  const session = model.sourceSnapshot.activeSession;
  const selectedEntityId = model.sourceSnapshot.selectedEntityId;
  const rows = {
    [PIPE_SOLVER_ACTIONS.OPEN_SESSION]: [EVENT_TOPICS.ANALYSIS_SESSION_OPEN_REQUESTED, { analysisType: PIPE_SCREENING_ANALYSIS_TYPE, targetId: selectedEntityId }],
    [PIPE_SOLVER_ACTIONS.UPDATE_OVERRIDE]: [EVENT_TOPICS.ANALYSIS_SESSION_OVERRIDE_REQUESTED, { sessionId: session?.sessionId, fieldKey: request.fieldKey, value: request.value }],
    [PIPE_SOLVER_ACTIONS.RESET_SESSION]: [EVENT_TOPICS.ANALYSIS_SESSION_RESET_REQUESTED, { sessionId: session?.sessionId }],
    [PIPE_SOLVER_ACTIONS.RUN_SCREENING]: [EVENT_TOPICS.ANALYSIS_REQUESTED, { analysisType: PIPE_SCREENING_ANALYSIS_TYPE, targetId: selectedEntityId, sessionId: session?.sessionId }],
    [PIPE_SOLVER_ACTIONS.CLOSE_SESSION]: [EVENT_TOPICS.ANALYSIS_SESSION_CLOSE_REQUESTED, {}],
    [PIPE_SOLVER_ACTIONS.SELECT_LEDGER_ENTRY]: [EVENT_TOPICS.ANALYSIS_LEDGER_ACTIVE_REQUESTED, { entryId: request.entryId }],
    [PIPE_SOLVER_ACTIONS.EXPORT_LEDGER]: [EVENT_TOPICS.ANALYSIS_EXPORT_REQUESTED, { format: request.format }],
  };
  const row = rows[action];
  return row ? { topic: row[0], payload: row[1] } : null;
}

function bindActions(view, controller) {
  bind(view, 'open', () => controller.publish(PIPE_SOLVER_ACTIONS.OPEN_SESSION));
  bind(view, 'reset', () => controller.publish(PIPE_SOLVER_ACTIONS.RESET_SESSION));
  bind(view, 'run', () => controller.publish(PIPE_SOLVER_ACTIONS.RUN_SCREENING));
  bind(view, 'close', () => controller.publish(PIPE_SOLVER_ACTIONS.CLOSE_SESSION));
  bind(view, 'export', () => controller.publish(PIPE_SOLVER_ACTIONS.EXPORT_LEDGER, {
    format: view.querySelector('[data-pipe-solver-export-format]')?.value || '',
  }));
  view.querySelectorAll('[data-pipe-solver-field]').forEach((input) => {
    input.addEventListener('change', () => controller.publish(PIPE_SOLVER_ACTIONS.UPDATE_OVERRIDE, {
      fieldKey: input.dataset.pipeSolverField,
      value: input.value,
    }));
  });
  view.querySelectorAll('[data-pipe-solver-ledger-entry]').forEach((button) => {
    button.addEventListener('click', () => controller.publish(PIPE_SOLVER_ACTIONS.SELECT_LEDGER_ENTRY, {
      entryId: button.dataset.pipeSolverLedgerEntry,
    }));
  });
}

function bind(view, action, callback) {
  view.querySelector(`[data-pipe-solver-action="${action}"]`)?.addEventListener('click', callback);
}
