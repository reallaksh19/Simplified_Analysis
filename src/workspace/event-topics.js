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
 * @typedef {{ datasetId: string, nodeCount: number }} DatasetLoadedPayload
 * @typedef {{
 *   entityId: string,
 *   type?: 'pipe' | 'support',
 *   properties?: Record<string, unknown>
 * }} EntitySelectedPayload
 * @typedef {{ analysisType: string, targetId: string }} AnalysisRequestedPayload
 */
