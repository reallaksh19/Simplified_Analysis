export const EVENT_TOPICS = Object.freeze({
  DATASET_LOAD_REQUESTED: 'dataset:loadRequested',
  DATASET_CLEAR_REQUESTED: 'dataset:clearRequested',
  DATASET_LOADED: 'dataset:loaded',
  DATASET_LOAD_FAILED: 'dataset:loadFailed',
  DATASET_CLEARED: 'dataset:cleared',
  WORKSPACE_SNAPSHOT_CHANGED: 'workspace:snapshotChanged',
  VIEWPORT_SELECTION_REQUESTED: 'viewport:selectionRequested',
  VIEWPORT_ENTITY_SELECTED: 'viewport:entitySelected',
  ANALYSIS_CAPABILITIES_CHANGED: 'analysis:capabilitiesChanged',
  ANALYSIS_SESSION_OPEN_REQUESTED: 'analysis:sessionOpenRequested',
  ANALYSIS_SESSION_OVERRIDE_REQUESTED: 'analysis:sessionOverrideRequested',
  ANALYSIS_SESSION_RESET_REQUESTED: 'analysis:sessionResetRequested',
  ANALYSIS_SESSION_CLOSE_REQUESTED: 'analysis:sessionCloseRequested',
  ANALYSIS_SESSION_CHANGED: 'analysis:sessionChanged',
  ANALYSIS_REQUESTED: 'analysis:requested',
  ANALYSIS_STARTED: 'analysis:started',
  ANALYSIS_COMPLETED: 'analysis:completed',
  ANALYSIS_FAILED: 'analysis:failed',
});

export function assertEventPayload(topic, payload) {
  const validator = PAYLOAD_VALIDATORS.get(topic);
  validator?.(payload);
}

const PAYLOAD_VALIDATORS = new Map([
  [EVENT_TOPICS.DATASET_LOAD_REQUESTED, validateDatasetLoadRequested],
  [EVENT_TOPICS.DATASET_CLEAR_REQUESTED, validateOptionalEmptyPayload],
  [EVENT_TOPICS.DATASET_LOADED, validateDatasetLoaded],
  [EVENT_TOPICS.DATASET_LOAD_FAILED, validateDatasetLoadFailed],
  [EVENT_TOPICS.DATASET_CLEARED, validateDatasetCleared],
  [EVENT_TOPICS.WORKSPACE_SNAPSHOT_CHANGED, validateSnapshotChanged],
  [EVENT_TOPICS.VIEWPORT_SELECTION_REQUESTED, validateSelectionRequested],
  [EVENT_TOPICS.VIEWPORT_ENTITY_SELECTED, validateEntitySelected],
  [EVENT_TOPICS.ANALYSIS_CAPABILITIES_CHANGED, validateCapabilitiesChanged],
  [EVENT_TOPICS.ANALYSIS_SESSION_OPEN_REQUESTED, validateSessionOpenRequested],
  [EVENT_TOPICS.ANALYSIS_SESSION_OVERRIDE_REQUESTED, validateSessionOverrideRequested],
  [EVENT_TOPICS.ANALYSIS_SESSION_RESET_REQUESTED, validateSessionIdentity],
  [EVENT_TOPICS.ANALYSIS_SESSION_CLOSE_REQUESTED, validateOptionalEmptyPayload],
  [EVENT_TOPICS.ANALYSIS_SESSION_CHANGED, validateSessionChanged],
  [EVENT_TOPICS.ANALYSIS_REQUESTED, validateAnalysisRequested],
  [EVENT_TOPICS.ANALYSIS_STARTED, validateAnalysisLifecycle],
  [EVENT_TOPICS.ANALYSIS_COMPLETED, validateAnalysisCompleted],
  [EVENT_TOPICS.ANALYSIS_FAILED, validateAnalysisFailed],
]);

const SELECTION_SOURCES = new Set(['tree', 'viewport', 'api']);

function validateDatasetLoadRequested(payload) {
  assertRecord(payload, EVENT_TOPICS.DATASET_LOAD_REQUESTED);
  const rawPackageValid = isRecord(payload.rawPackage) || Array.isArray(payload.rawPackage);
  if (!rawPackageValid) {
    throw new TypeError('dataset:loadRequested payload.rawPackage must be an object or array.');
  }
  if (payload.sourceName !== undefined && typeof payload.sourceName !== 'string') {
    throw new TypeError('dataset:loadRequested payload.sourceName must be a string.');
  }
}

function validateOptionalEmptyPayload(payload) {
  if (payload !== undefined && !isRecord(payload)) {
    throw new TypeError('Event payload must be omitted or an object.');
  }
}

function validateDatasetLoaded(payload) {
  assertRecord(payload, EVENT_TOPICS.DATASET_LOADED);
  assertNonEmptyString(payload.datasetId, 'datasetId', EVENT_TOPICS.DATASET_LOADED);
  if (!Number.isInteger(payload.nodeCount) || payload.nodeCount < 0) {
    throw new TypeError('dataset:loaded payload.nodeCount must be a non-negative integer.');
  }
}

function validateDatasetLoadFailed(payload) {
  assertRecord(payload, EVENT_TOPICS.DATASET_LOAD_FAILED);
  assertNonEmptyString(payload.message, 'message', EVENT_TOPICS.DATASET_LOAD_FAILED);
  if (payload.sourceName !== undefined && typeof payload.sourceName !== 'string') {
    throw new TypeError('dataset:loadFailed payload.sourceName must be a string.');
  }
}

function validateDatasetCleared(payload) {
  assertRecord(payload, EVENT_TOPICS.DATASET_CLEARED);
  assertNonNegativeInteger(payload.version, 'version', EVENT_TOPICS.DATASET_CLEARED);
}

function validateSnapshotChanged(payload) {
  assertRecord(payload, EVENT_TOPICS.WORKSPACE_SNAPSHOT_CHANGED);
  if (!isRecord(payload.snapshot)) {
    throw new TypeError('workspace:snapshotChanged payload.snapshot must be an object.');
  }
}

function validateSelectionRequested(payload) {
  assertRecord(payload, EVENT_TOPICS.VIEWPORT_SELECTION_REQUESTED);
  assertNonEmptyString(payload.entityId, 'entityId', EVENT_TOPICS.VIEWPORT_SELECTION_REQUESTED);
  validateSelectionSource(payload.source, EVENT_TOPICS.VIEWPORT_SELECTION_REQUESTED);
}

function validateEntitySelected(payload) {
  assertRecord(payload, EVENT_TOPICS.VIEWPORT_ENTITY_SELECTED);
  assertNonEmptyString(payload.entityId, 'entityId', EVENT_TOPICS.VIEWPORT_ENTITY_SELECTED);
  if (payload.type !== undefined && payload.type !== 'pipe' && payload.type !== 'support') {
    throw new TypeError("viewport:entitySelected payload.type must be 'pipe' or 'support'.");
  }
  if (payload.properties !== undefined && !isRecord(payload.properties)) {
    throw new TypeError('viewport:entitySelected payload.properties must be an object.');
  }
  if (payload.source !== undefined) validateSelectionSource(payload.source, EVENT_TOPICS.VIEWPORT_ENTITY_SELECTED);
}

function validateCapabilitiesChanged(payload) {
  assertRecord(payload, EVENT_TOPICS.ANALYSIS_CAPABILITIES_CHANGED);
  if (typeof payload.targetId !== 'string') {
    throw new TypeError('analysis:capabilitiesChanged payload.targetId must be a string.');
  }
  if (!Array.isArray(payload.capabilities)) {
    throw new TypeError('analysis:capabilitiesChanged payload.capabilities must be an array.');
  }
  payload.capabilities.forEach((capability) => {
    assertRecord(capability, EVENT_TOPICS.ANALYSIS_CAPABILITIES_CHANGED);
    assertNonEmptyString(capability.analysisType, 'analysisType', EVENT_TOPICS.ANALYSIS_CAPABILITIES_CHANGED);
    assertNonEmptyString(capability.label, 'label', EVENT_TOPICS.ANALYSIS_CAPABILITIES_CHANGED);
    if (typeof capability.enabled !== 'boolean') {
      throw new TypeError('analysis:capabilitiesChanged capability.enabled must be boolean.');
    }
  });
}

function validateSessionOpenRequested(payload) {
  assertRecord(payload, EVENT_TOPICS.ANALYSIS_SESSION_OPEN_REQUESTED);
  assertNonEmptyString(payload.analysisType, 'analysisType', EVENT_TOPICS.ANALYSIS_SESSION_OPEN_REQUESTED);
  assertNonEmptyString(payload.targetId, 'targetId', EVENT_TOPICS.ANALYSIS_SESSION_OPEN_REQUESTED);
}

function validateSessionOverrideRequested(payload) {
  validateSessionIdentity(payload);
  assertNonEmptyString(payload.fieldKey, 'fieldKey', EVENT_TOPICS.ANALYSIS_SESSION_OVERRIDE_REQUESTED);
  if (!['string', 'number'].includes(typeof payload.value) && payload.value !== null) {
    throw new TypeError('analysis:sessionOverrideRequested payload.value must be string, number, or null.');
  }
}

function validateSessionIdentity(payload) {
  assertRecord(payload, 'analysis session event');
  assertNonEmptyString(payload.sessionId, 'sessionId', 'analysis session event');
}

function validateSessionChanged(payload) {
  assertRecord(payload, EVENT_TOPICS.ANALYSIS_SESSION_CHANGED);
  assertNonNegativeInteger(payload.version, 'version', EVENT_TOPICS.ANALYSIS_SESSION_CHANGED);
  if (payload.session !== null && !isRecord(payload.session)) {
    throw new TypeError('analysis:sessionChanged payload.session must be an object or null.');
  }
  if (payload.session) {
    assertNonEmptyString(payload.session.sessionId, 'session.sessionId', EVENT_TOPICS.ANALYSIS_SESSION_CHANGED);
    assertNonEmptyString(payload.session.analysisType, 'session.analysisType', EVENT_TOPICS.ANALYSIS_SESSION_CHANGED);
    assertNonEmptyString(payload.session.targetId, 'session.targetId', EVENT_TOPICS.ANALYSIS_SESSION_CHANGED);
  }
}

function validateAnalysisRequested(payload) {
  assertRecord(payload, EVENT_TOPICS.ANALYSIS_REQUESTED);
  assertNonEmptyString(payload.analysisType, 'analysisType', EVENT_TOPICS.ANALYSIS_REQUESTED);
  assertNonEmptyString(payload.targetId, 'targetId', EVENT_TOPICS.ANALYSIS_REQUESTED);
  validateOptionalSessionId(payload, EVENT_TOPICS.ANALYSIS_REQUESTED);
}

function validateAnalysisLifecycle(payload) {
  assertRecord(payload, 'analysis lifecycle');
  assertNonEmptyString(payload.requestId, 'requestId', 'analysis lifecycle');
  assertNonEmptyString(payload.analysisType, 'analysisType', 'analysis lifecycle');
  assertNonEmptyString(payload.targetId, 'targetId', 'analysis lifecycle');
  validateOptionalSessionId(payload, 'analysis lifecycle');
}

function validateAnalysisCompleted(payload) {
  validateAnalysisLifecycle(payload);
  if (!isRecord(payload.result)) {
    throw new TypeError('analysis:completed payload.result must be an object.');
  }
}

function validateAnalysisFailed(payload) {
  validateAnalysisLifecycle(payload);
  assertNonEmptyString(payload.code, 'code', EVENT_TOPICS.ANALYSIS_FAILED);
  assertNonEmptyString(payload.message, 'message', EVENT_TOPICS.ANALYSIS_FAILED);
  if (payload.details !== undefined && !isRecord(payload.details)) {
    throw new TypeError('analysis:failed payload.details must be an object.');
  }
}

function validateOptionalSessionId(payload, topic) {
  if (payload.sessionId !== undefined && payload.sessionId !== '') {
    assertNonEmptyString(payload.sessionId, 'sessionId', topic);
  }
}

function validateSelectionSource(value, topic) {
  if (!SELECTION_SOURCES.has(value)) {
    throw new TypeError(`${topic} payload.source must be 'tree', 'viewport', or 'api'.`);
  }
}

function assertRecord(value, topic) {
  if (!isRecord(value)) throw new TypeError(`${topic} payload must be an object.`);
}

function assertNonEmptyString(value, field, topic) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${topic} payload.${field} must be a non-empty string.`);
  }
}

function assertNonNegativeInteger(value, field, topic) {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(`${topic} payload.${field} must be a non-negative integer.`);
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
