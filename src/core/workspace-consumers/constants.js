export const CONTEXT_SCHEMA = 'workspace-consumer-context/v1';
export const REGISTRY_SCHEMA = 'workspace-consumer-registry/v1';
export const READINESS_SCHEMA = 'workspace-consumer-readiness/v1';
export const VIEW_STATE_SCHEMA = 'application-view-state/v1';

export const CONSUMER_IDS = Object.freeze([
  'WORKSPACE', 'REPORTS', 'LOAD_CALC', 'THREE_D_CALC', 'PIPE_SOLVER', 'QA', 'DEBUG',
]);
export const IMPLEMENTATION_STATUS = Object.freeze({ IMPLEMENTED: 'IMPLEMENTED', NOT_IMPLEMENTED: 'NOT_IMPLEMENTED' });
export const READINESS_STATES = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  MISSING: 'BLOCKED_MISSING_CONTRACTS',
  INVALID: 'BLOCKED_INVALID_CONTRACTS',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
});
export const CONTRACT_KEYS = Object.freeze([
  'sharedModel', 'topologyGraph', 'topologyAudit', 'supportAttachmentModel',
  'supportAttachmentAudit', 'restraintCapabilityModel', 'restraintCapabilityAudit',
  'loadCaseSet', 'loadPrimitiveSet', 'modelLoadReadinessAudit', 'verticalLoadPathModel',
  'supportLoadScreening', 'supportLoadScreeningAudit', 'flexuralPropertyProjection',
  'verticalBeamModel', 'verticalBeamSolution', 'verticalBeamSolverAudit',
  'modelCalculationLedger', 'activeModelCalculationPackage', 'activeModelCalculationReport',
]);