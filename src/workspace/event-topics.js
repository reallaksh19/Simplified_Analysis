/**
 * Canonical cross-panel event topics for the Analysis Workspace.
 * Panel controllers must communicate exclusively through these topics.
 */
export const EVENT_TOPICS = Object.freeze({
  DATASET_LOADED: 'dataset:loaded',
  VIEWPORT_ENTITY_SELECTED: 'viewport:entitySelected',
  ANALYSIS_REQUESTED: 'analysis:requested',
});

/**
 * Runtime contract enforcement for canonical topics.
 *
 * `type` and `properties` remain optional for viewport selection so the required
 * DevTools verification payload can publish only an entity ID and properties.
 * Production panel publishers provide the complete canonical payload.
 */
export function assertEventPayload(topic, payload) {
  const validator = PAYLOAD_VALIDATORS.get(topic);
  validator?.(payload);
}

const PAYLOAD_VALIDATORS = new Map([
  [EVENT_TOPICS.DATASET_LOADED, validateDatasetLoaded],
  [EVENT_TOPICS.VIEWPORT_ENTITY_SELECTED, validateEntitySelected],
  [EVENT_TOPICS.ANALYSIS_REQUESTED, validateAnalysisRequested],
]);

function validateDatasetLoaded(payload) {
  assertRecord(payload, EVENT_TOPICS.DATASET_LOADED);
  assertNonEmptyString(payload.datasetId, 'datasetId', EVENT_TOPICS.DATASET_LOADED);

  if (!Number.isInteger(payload.nodeCount) || payload.nodeCount < 0) {
    throw new TypeError('dataset:loaded payload.nodeCount must be a non-negative integer.');
  }
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
}

function validateAnalysisRequested(payload) {
  assertRecord(payload, EVENT_TOPICS.ANALYSIS_REQUESTED);
  assertNonEmptyString(payload.analysisType, 'analysisType', EVENT_TOPICS.ANALYSIS_REQUESTED);
  assertNonEmptyString(payload.targetId, 'targetId', EVENT_TOPICS.ANALYSIS_REQUESTED);
}

function assertRecord(value, topic) {
  if (!isRecord(value)) {
    throw new TypeError(`${topic} payload must be an object.`);
  }
}

function assertNonEmptyString(value, field, topic) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${topic} payload.${field} must be a non-empty string.`);
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @typedef {{ datasetId: string, nodeCount: number }} DatasetLoadedPayload
 * @typedef {{
 *   entityId: string,
 *   type?: 'pipe' | 'support',
 *   properties?: Record<string, unknown>
 * }} EntitySelectedPayload
 * @typedef {{ analysisType: string, targetId: string }} AnalysisRequestedPayload
 */