export const WORKSPACE_CONSUMER_CONTEXT_SCHEMA = 'workspace-consumer-context/v1';
export const WORKSPACE_CONSUMER_REGISTRY_SCHEMA = 'workspace-consumer-registry/v1';
export const WORKSPACE_CONSUMER_REGISTRY_V2_SCHEMA = 'workspace-consumer-registry/v2';
export const WORKSPACE_CONSUMER_REGISTRY_V3_SCHEMA = 'workspace-consumer-registry/v3';
export const WORKSPACE_CONSUMER_REGISTRY_V4_SCHEMA = 'workspace-consumer-registry/v4';
export const WORKSPACE_CONSUMER_READINESS_SCHEMA = 'workspace-consumer-readiness/v1';
export const APPLICATION_VIEW_STATE_SCHEMA = 'application-view-state/v1';
export const APPLICATION_VIEW_STATE_V2_SCHEMA = 'application-view-state/v2';
export const APPLICATION_VIEW_STATE_V3_SCHEMA = 'application-view-state/v3';
export const APPLICATION_VIEW_STATE_V4_SCHEMA = 'application-view-state/v4';

export const CONTRACT_KEYS = Object.freeze([
  'sharedModel',
  'topologyGraph',
  'topologyAudit',
  'supportAttachmentModel',
  'supportAttachmentAudit',
  'restraintCapabilityModel',
  'restraintCapabilityAudit',
  'loadCaseSet',
  'loadPrimitiveSet',
  'modelLoadReadinessAudit',
  'verticalLoadPathModel',
  'supportLoadScreening',
  'supportLoadScreeningAudit',
  'flexuralPropertyProjection',
  'verticalBeamModel',
  'verticalBeamSolution',
  'verticalBeamSolverAudit',
  'modelCalculationLedger',
  'activeModelCalculationPackage',
  'activeModelCalculationReport',
]);

export const CONSUMER_IDS = Object.freeze({
  WORKSPACE: 'WORKSPACE',
  REPORTS: 'REPORTS',
  LOAD_CALC: 'LOAD_CALC',
  THREE_D_CALC: 'THREE_D_CALC',
  PIPE_SOLVER: 'PIPE_SOLVER',
  QA: 'QA',
  DEBUG: 'DEBUG',
});

export const IMPLEMENTATION_STATUS = Object.freeze({
  IMPLEMENTED: 'IMPLEMENTED',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
});

export const READINESS_STATES = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  BLOCKED_MISSING_CONTRACTS: 'BLOCKED_MISSING_CONTRACTS',
  BLOCKED_INVALID_CONTRACTS: 'BLOCKED_INVALID_CONTRACTS',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
});

export const APPLICATION_VIEW_IDS = Object.freeze([
  CONSUMER_IDS.WORKSPACE,
  CONSUMER_IDS.REPORTS,
]);

export const APPLICATION_VIEW_IDS_V2 = Object.freeze([
  CONSUMER_IDS.WORKSPACE,
  CONSUMER_IDS.REPORTS,
  CONSUMER_IDS.LOAD_CALC,
]);

export const APPLICATION_VIEW_IDS_V3 = Object.freeze([
  CONSUMER_IDS.WORKSPACE,
  CONSUMER_IDS.REPORTS,
  CONSUMER_IDS.LOAD_CALC,
  CONSUMER_IDS.THREE_D_CALC,
]);

export const APPLICATION_VIEW_IDS_V4 = Object.freeze([
  CONSUMER_IDS.WORKSPACE,
  CONSUMER_IDS.REPORTS,
  CONSUMER_IDS.LOAD_CALC,
  CONSUMER_IDS.THREE_D_CALC,
  CONSUMER_IDS.PIPE_SOLVER,
]);
