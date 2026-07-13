export const EVENT_TOPICS = Object.freeze({
  DATASET_LOAD_REQUESTED: 'dataset:loadRequested',
  DATASET_CLEAR_REQUESTED: 'dataset:clearRequested',
  DATASET_LOADED: 'dataset:loaded',
  DATASET_LOAD_FAILED: 'dataset:loadFailed',
  DATASET_CLEARED: 'dataset:cleared',
  WORKSPACE_SNAPSHOT_CHANGED: 'workspace:snapshotChanged',
  VIEWPORT_SELECTION_REQUESTED: 'viewport:selectionRequested',
  VIEWPORT_ENTITY_SELECTED: 'viewport:entitySelected',
  ANALYSIS_REQUESTED: 'analysis:requested',
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
  [EVENT_TOPICS.ANALYSIS_REQUESTED, validateAnalysisRequested],
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
    throw new TypeError('dataset:clearRequested payload must be omitted or an object.');
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
  if (!Number.isInteger(payload.version) || payload.version < 0) {
    throw new TypeError('dataset:cleared payload.version must be a non-negative integer.');
  }
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
  if (payload.source !== undefined) {
    validateSelectionSource(payload.source, EVENT_TOPICS.VIEWPORT_ENTITY_SELECTED);
  }
}

function validateAnalysisRequested(payload) {
  assertRecord(payload, EVENT_TOPICS.ANALYSIS_REQUESTED);
  assertNonEmptyString(payload.analysisType, 'analysisType', EVENT_TOPICS.ANALYSIS_REQUESTED);
  assertNonEmptyString(payload.targetId, 'targetId', EVENT_TOPICS.ANALYSIS_REQUESTED);
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

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
