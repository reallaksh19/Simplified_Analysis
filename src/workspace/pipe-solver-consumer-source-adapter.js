import {
  PIPE_SCREENING_ANALYSIS_TYPE,
  PIPE_SOLVER_DIAGNOSTIC_CODES,
  createPipeSolverConsumerSource,
} from '../core/pipe-solver-consumer/index.js';

export function createPipeSolverConsumerSourceFromWorkspace(dependencies) {
  assertDependencies(dependencies);
  const { sourceContext, workspaceState, capabilityRegistry, sessionStore, ledgerStore } = dependencies;
  const workspaceSnapshot = workspaceState.getSnapshot();
  const selectedEntity = selectedEntityFor(workspaceState, sourceContext);
  const activeSession = sessionStore.getSnapshot().session || null;
  const diagnostics = [];
  const capabilityInspection = inspectCapability({
    capabilityRegistry,
    selectedEntity,
    workspaceSnapshot,
    activeSession,
    diagnostics,
  });
  return createPipeSolverConsumerSource({
    sourceContext,
    selectedEntity,
    capabilityInspection,
    activeSession,
    ledgerSnapshot: ledgerStore.getSnapshot(),
    diagnostics,
  });
}

function inspectCapability(input) {
  if (!input.selectedEntity || input.workspaceSnapshot.status !== 'ready') return null;
  try {
    return input.capabilityRegistry.inspect(
      PIPE_SCREENING_ANALYSIS_TYPE,
      analysisContext(input),
    );
  } catch (error) {
    input.diagnostics.push({
      severity: 'ERROR',
      code: PIPE_SOLVER_DIAGNOSTIC_CODES.CAPABILITY_INSPECTION_FAILED,
      message: error instanceof Error ? error.message : String(error),
      details: {},
    });
    return null;
  }
}

function analysisContext({ selectedEntity, workspaceSnapshot, activeSession }) {
  const context = {
    targetId: selectedEntity.entityId,
    entity: selectedEntity,
    dataset: workspaceSnapshot.dataset,
    selectedEntityId: workspaceSnapshot.selectedEntityId,
    version: workspaceSnapshot.version,
  };
  return sessionMatches(activeSession, context)
    ? { ...context, analysisSession: sessionProjection(activeSession) }
    : context;
}

function sessionMatches(session, context) {
  return session?.analysisType === PIPE_SCREENING_ANALYSIS_TYPE
    && session.datasetId === context.dataset.datasetId
    && session.targetId === context.targetId;
}

function sessionProjection(session) {
  return {
    schema: session.schema,
    sessionId: session.sessionId,
    targetId: session.targetId,
    analysisType: session.analysisType,
    datasetId: session.datasetId,
    workspaceVersion: session.workspaceVersion,
    version: session.version,
    overrides: session.overrides,
  };
}

function selectedEntityFor(workspaceState, context) {
  const selectedEntityId = context?.selectedEntityId || '';
  return selectedEntityId ? workspaceState.getEntity(selectedEntityId) : null;
}

function assertDependencies(value) {
  for (const key of ['sourceContext','workspaceState','capabilityRegistry','sessionStore','ledgerStore']) {
    if (!value?.[key]) throw new TypeError(`Pipe Solver source adapter requires injected ${key}.`);
  }
  for (const [key, method] of [
    ['workspaceState','getSnapshot'], ['capabilityRegistry','inspect'],
    ['sessionStore','getSnapshot'], ['ledgerStore','getSnapshot'],
  ]) {
    if (typeof value[key][method] !== 'function') throw new TypeError(`Pipe Solver injected ${key} is invalid.`);
  }
}
