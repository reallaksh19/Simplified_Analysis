import {
  createPipeSolverConsumerSource,
  isMatchingPipeSolverSession,
  PIPE_SCREENING_ANALYSIS_TYPE,
} from '../core/pipe-solver-consumer/index.js';
import { validateWorkspaceConsumerContext } from '../core/workspace-consumers/index.js';
import { createAnalysisContext } from './analysis-context.js';
import { withAnalysisSession } from './analysis-session-context.js';

export class PipeSolverConsumerAdapter {
  constructor({ workspaceState, capabilityRegistry, sessionStore, ledgerStore } = {}) {
    requireMethod(workspaceState, 'getSnapshot', 'workspaceState');
    requireMethod(workspaceState, 'getEntity', 'workspaceState');
    requireMethod(capabilityRegistry, 'inspect', 'capabilityRegistry');
    requireMethod(capabilityRegistry, 'has', 'capabilityRegistry');
    requireMethod(sessionStore, 'getSnapshot', 'sessionStore');
    requireMethod(ledgerStore, 'getSnapshot', 'ledgerStore');
    this.workspaceState = workspaceState;
    this.capabilityRegistry = capabilityRegistry;
    this.sessionStore = sessionStore;
    this.ledgerStore = ledgerStore;
  }

  createSource(sourceContext) {
    const validation = validateWorkspaceConsumerContext(sourceContext);
    if (!validation.ok || !sourceContext.datasetId) return null;
    const workspace = this.workspaceState.getSnapshot();
    assertCurrentContext(sourceContext, workspace);
    const selectedEntity = sourceContext.selectedEntityId
      ? this.workspaceState.getEntity(sourceContext.selectedEntityId)
      : null;
    const sessionSnapshot = this.sessionStore.getSnapshot();
    const capabilityInspection = this.inspect(selectedEntity, sessionSnapshot.session, sourceContext);
    return createPipeSolverConsumerSource({
      sourceContext,
      selectedEntity,
      capabilityInspection,
      sessionSnapshot,
      ledgerSnapshot: this.ledgerStore.getSnapshot(),
    });
  }

  inspect(selectedEntity, session, sourceContext) {
    if (!selectedEntity) return null;
    if (!this.capabilityRegistry.has(PIPE_SCREENING_ANALYSIS_TYPE)) {
      throw new TypeError('The existing pipe-screening capability is not registered.');
    }
    let context = createAnalysisContext(this.workspaceState, selectedEntity.entityId);
    if (isMatchingPipeSolverSession(session, sourceContext)) {
      context = withAnalysisSession(context, session);
    }
    return this.capabilityRegistry.inspect(PIPE_SCREENING_ANALYSIS_TYPE, context);
  }
}

function assertCurrentContext(context, workspace) {
  if (workspace.status !== 'ready' || !workspace.dataset) {
    throw new TypeError('Pipe Solver source requires the active Workspace dataset.');
  }
  if (workspace.dataset.datasetId !== context.datasetId
    || workspace.version !== context.workspaceVersion
    || (workspace.selectedEntityId || null) !== context.selectedEntityId) {
    throw new TypeError('Pipe Solver source context is stale relative to Workspace state.');
  }
}

function requireMethod(value, method, label) {
  if (!value || typeof value[method] !== 'function') {
    throw new TypeError(`PipeSolverConsumerAdapter requires ${label}.${method}().`);
  }
}
