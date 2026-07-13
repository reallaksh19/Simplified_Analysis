import { EventBus } from './event-bus.js';
import { EVENT_TOPICS } from './event-topics.js';
import { renderPropertiesContent } from './properties-view.js';
import { WorkspaceState } from './workspace-state.js';

export class PropertiesPanel {
  constructor(rootElement, eventBus = EventBus, workspaceState = WorkspaceState) {
    if (!rootElement) throw new TypeError('PropertiesPanel requires a root element.');
    this.rootElement = rootElement;
    this.eventBus = eventBus;
    this.workspaceState = workspaceState;
    this.selection = null;
    this.capabilityTargetId = '';
    this.capabilities = [];
    this.analysisSession = null;
    this.analysisState = idleAnalysis();
    this.unsubscribeCallbacks = [];
    this.handleClick = this.handleClick.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }

  init() {
    if (this.unsubscribeCallbacks.length) return;
    this.contentElement = this.rootElement.querySelector('[data-role="properties-content"]');
    if (!this.contentElement) throw new Error('PropertiesPanel content root is missing.');

    this.rootElement.addEventListener('click', this.handleClick);
    this.rootElement.addEventListener('change', this.handleChange);
    this.unsubscribeCallbacks = [
      this.eventBus.subscribe(
        EVENT_TOPICS.VIEWPORT_ENTITY_SELECTED,
        (payload) => this.renderSelection(payload),
      ),
      this.eventBus.subscribe(
        EVENT_TOPICS.ANALYSIS_CAPABILITIES_CHANGED,
        (payload) => this.handleCapabilities(payload),
      ),
      this.eventBus.subscribe(
        EVENT_TOPICS.ANALYSIS_SESSION_CHANGED,
        (payload) => this.handleSessionChanged(payload),
      ),
      this.eventBus.subscribe(
        EVENT_TOPICS.ANALYSIS_STARTED,
        (payload) => this.handleAnalysisStarted(payload),
      ),
      this.eventBus.subscribe(
        EVENT_TOPICS.ANALYSIS_COMPLETED,
        (payload) => this.handleAnalysisCompleted(payload),
      ),
      this.eventBus.subscribe(
        EVENT_TOPICS.ANALYSIS_FAILED,
        (payload) => this.handleAnalysisFailed(payload),
      ),
      this.eventBus.subscribe(EVENT_TOPICS.DATASET_CLEARED, () => this.renderEmpty()),
    ];
  }

  renderSelection(payload = {}) {
    const stateEntity = this.workspaceState.getEntity(payload.entityId);
    const selection = stateEntity
      ? {
          entityId: stateEntity.entityId,
          type: stateEntity.selectionType,
          entityType: stateEntity.entityType,
          properties: stateEntity.properties,
        }
      : {
          entityId: String(payload.entityId ?? 'Unknown entity'),
          type: String(payload.type ?? 'unclassified'),
          entityType: String(payload.type ?? 'unclassified'),
          properties: isPlainObject(payload.properties) ? payload.properties : {},
        };

    const changed = this.selection?.entityId !== selection.entityId;
    this.selection = selection;
    if (changed) {
      this.analysisState = idleAnalysis();
      if (this.capabilityTargetId !== selection.entityId) this.capabilities = [];
      if (this.analysisSession?.targetId !== selection.entityId) this.analysisSession = null;
    }
    this.render();
  }

  handleCapabilities({ targetId, capabilities }) {
    this.capabilityTargetId = targetId;
    this.capabilities = capabilities;
    if (this.selection?.entityId === targetId) this.render();
  }

  handleSessionChanged({ session }) {
    this.analysisSession = session && session.targetId === this.selection?.entityId ? session : null;
    if (this.selection) this.render();
  }

  handleAnalysisStarted(payload) {
    if (!this.isCurrentTarget(payload.targetId)) return;
    this.analysisState = {
      status: 'running',
      requestId: payload.requestId,
      sessionId: payload.sessionId || '',
      analysisType: payload.analysisType,
      targetId: payload.targetId,
    };
    this.render();
  }

  handleAnalysisCompleted(payload) {
    if (!this.isCurrentRequest(payload)) return;
    this.analysisState = {
      status: 'completed',
      requestId: payload.requestId,
      sessionId: payload.sessionId || '',
      analysisType: payload.analysisType,
      targetId: payload.targetId,
      result: payload.result,
    };
    this.render();
  }

  handleAnalysisFailed(payload) {
    if (!this.isCurrentRequest(payload)) return;
    this.analysisState = {
      status: 'failed',
      requestId: payload.requestId,
      sessionId: payload.sessionId || '',
      analysisType: payload.analysisType,
      targetId: payload.targetId,
      code: payload.code,
      message: payload.message,
      details: payload.details || {},
    };
    this.render();
  }

  isCurrentTarget(targetId) {
    return this.selection?.entityId === targetId;
  }

  isCurrentRequest(payload) {
    return this.isCurrentTarget(payload.targetId)
      && this.analysisState.requestId === payload.requestId;
  }

  render() {
    if (!this.selection) {
      this.renderEmpty();
      return;
    }
    const capabilities = this.capabilityTargetId === this.selection.entityId
      ? this.capabilities
      : [];
    const session = this.analysisSession?.targetId === this.selection.entityId
      ? this.analysisSession
      : null;
    this.contentElement.replaceChildren(renderPropertiesContent(
      this.rootElement.ownerDocument,
      this.selection,
      capabilities,
      this.analysisState,
      session,
    ));
  }

  handleClick(event) {
    const analysisAction = event.target?.closest?.('[data-analysis-action="open-session"]');
    if (analysisAction && this.rootElement.contains(analysisAction) && this.selection) {
      this.eventBus.publish(EVENT_TOPICS.ANALYSIS_SESSION_OPEN_REQUESTED, {
        analysisType: analysisAction.dataset.analysisType,
        targetId: this.selection.entityId,
      });
      return;
    }

    const sessionAction = event.target?.closest?.('[data-session-action]');
    if (!sessionAction || !this.rootElement.contains(sessionAction) || sessionAction.disabled) return;
    const sessionId = sessionAction.dataset.sessionId;
    if (sessionAction.dataset.sessionAction === 'run' && this.analysisSession) {
      this.eventBus.publish(EVENT_TOPICS.ANALYSIS_REQUESTED, {
        analysisType: this.analysisSession.analysisType,
        targetId: this.analysisSession.targetId,
        sessionId,
      });
    }
    if (sessionAction.dataset.sessionAction === 'reset') {
      this.eventBus.publish(EVENT_TOPICS.ANALYSIS_SESSION_RESET_REQUESTED, { sessionId });
    }
    if (sessionAction.dataset.sessionAction === 'close') {
      this.eventBus.publish(EVENT_TOPICS.ANALYSIS_SESSION_CLOSE_REQUESTED, {});
    }
  }

  handleChange(event) {
    const input = event.target?.closest?.('[data-session-field]');
    if (!input || !this.rootElement.contains(input)) return;
    this.eventBus.publish(EVENT_TOPICS.ANALYSIS_SESSION_OVERRIDE_REQUESTED, {
      sessionId: input.dataset.sessionId,
      fieldKey: input.dataset.sessionField,
      value: input.value,
    });
  }

  renderEmpty() {
    this.selection = null;
    this.capabilityTargetId = '';
    this.capabilities = [];
    this.analysisSession = null;
    this.analysisState = idleAnalysis();
    const empty = this.rootElement.ownerDocument.createElement('p');
    empty.className = 'panel-empty';
    empty.textContent = 'Select a pipe or support to inspect its properties.';
    this.contentElement.replaceChildren(empty);
  }

  destroy() {
    this.rootElement.removeEventListener('click', this.handleClick);
    this.rootElement.removeEventListener('change', this.handleChange);
    this.unsubscribeCallbacks.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeCallbacks = [];
    this.selection = null;
    this.capabilities = [];
    this.analysisSession = null;
    this.analysisState = idleAnalysis();
  }
}

function idleAnalysis() {
  return Object.freeze({
    status: 'idle',
    requestId: '',
    sessionId: '',
    analysisType: '',
    targetId: '',
  });
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
