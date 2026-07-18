import { canonicalStringify, deepFreeze } from '../shared-piping-model/index.js';
import {
  APPLICATION_VIEW_IDS,
  APPLICATION_VIEW_IDS_V2,
  APPLICATION_VIEW_IDS_V3,
  APPLICATION_VIEW_IDS_V4,
  APPLICATION_VIEW_STATE_SCHEMA,
  APPLICATION_VIEW_STATE_V2_SCHEMA,
  APPLICATION_VIEW_STATE_V3_SCHEMA,
  APPLICATION_VIEW_STATE_V4_SCHEMA,
  CONSUMER_IDS,
  READINESS_STATES,
} from './constants.js';
import { validateWorkspaceConsumerReadinessShape } from './readiness.js';

export function createApplicationViewState(readinessRecords = [], options = {}) { return createState(APPLICATION_VIEW_STATE_SCHEMA, APPLICATION_VIEW_IDS, readinessRecords, options); }
export function createApplicationViewStateV2(readinessRecords = [], options = {}) { return createState(APPLICATION_VIEW_STATE_V2_SCHEMA, APPLICATION_VIEW_IDS_V2, readinessRecords, options); }
export function createApplicationViewStateV3(readinessRecords = [], options = {}) { return createState(APPLICATION_VIEW_STATE_V3_SCHEMA, APPLICATION_VIEW_IDS_V3, readinessRecords, options); }
export function createApplicationViewStateV4(readinessRecords = [], options = {}) { return createState(APPLICATION_VIEW_STATE_V4_SCHEMA, APPLICATION_VIEW_IDS_V4, readinessRecords, options); }
export function transitionApplicationViewState(current, requestedViewId, readinessRecords) { return transitionState(APPLICATION_VIEW_IDS, createApplicationViewState, current, requestedViewId, readinessRecords); }
export function transitionApplicationViewStateV2(current, requestedViewId, readinessRecords) { return transitionState(APPLICATION_VIEW_IDS_V2, createApplicationViewStateV2, current, requestedViewId, readinessRecords); }
export function transitionApplicationViewStateV3(current, requestedViewId, readinessRecords) { return transitionState(APPLICATION_VIEW_IDS_V3, createApplicationViewStateV3, current, requestedViewId, readinessRecords); }
export function transitionApplicationViewStateV4(current, requestedViewId, readinessRecords) { return transitionState(APPLICATION_VIEW_IDS_V4, createApplicationViewStateV4, current, requestedViewId, readinessRecords); }
export function refreshApplicationViewState(current, readinessRecords) { return refreshState(createApplicationViewState, current, readinessRecords); }
export function refreshApplicationViewStateV2(current, readinessRecords) { return refreshState(createApplicationViewStateV2, current, readinessRecords); }
export function refreshApplicationViewStateV3(current, readinessRecords) { return refreshState(createApplicationViewStateV3, current, readinessRecords); }
export function refreshApplicationViewStateV4(current, readinessRecords) { return refreshState(createApplicationViewStateV4, current, readinessRecords); }
export function validateApplicationViewState(value) { return validateState(value, APPLICATION_VIEW_STATE_SCHEMA, APPLICATION_VIEW_IDS); }
export function validateApplicationViewStateV2(value) { return validateState(value, APPLICATION_VIEW_STATE_V2_SCHEMA, APPLICATION_VIEW_IDS_V2); }
export function validateApplicationViewStateV3(value) { return validateState(value, APPLICATION_VIEW_STATE_V3_SCHEMA, APPLICATION_VIEW_IDS_V3); }
export function validateApplicationViewStateV4(value) { return validateState(value, APPLICATION_VIEW_STATE_V4_SCHEMA, APPLICATION_VIEW_IDS_V4); }
export function validateApplicationViewStateAny(value) {
  if (value?.schema === APPLICATION_VIEW_STATE_V4_SCHEMA) return validateApplicationViewStateV4(value);
  if (value?.schema === APPLICATION_VIEW_STATE_V3_SCHEMA) return validateApplicationViewStateV3(value);
  if (value?.schema === APPLICATION_VIEW_STATE_V2_SCHEMA) return validateApplicationViewStateV2(value);
  return validateApplicationViewState(value);
}
export function assertApplicationViewId(viewId) { assertViewId(viewId, APPLICATION_VIEW_IDS); }
export function assertApplicationViewIdV2(viewId) { assertViewId(viewId, APPLICATION_VIEW_IDS_V2); }
export function assertApplicationViewIdV3(viewId) { assertViewId(viewId, APPLICATION_VIEW_IDS_V3); }
export function assertApplicationViewIdV4(viewId) { assertViewId(viewId, APPLICATION_VIEW_IDS_V4); }

function createState(schema, viewIds, readinessRecords, options) {
  const readiness = normalizeReadiness(readinessRecords, viewIds);
  const availableViewIds = viewIds.filter((id) => readiness[id]?.readinessState === READINESS_STATES.AVAILABLE);
  if (!availableViewIds.includes(CONSUMER_IDS.WORKSPACE)) throw new TypeError('Workspace view must be available.');
  const requested = options.activeViewId || CONSUMER_IDS.WORKSPACE;
  const activeViewId = availableViewIds.includes(requested) ? requested : CONSUMER_IDS.WORKSPACE;
  const version = Number.isInteger(options.version) && options.version >= 0 ? options.version : 0;
  return deepFreeze({ schema, activeViewId, availableViewIds, viewReadiness: readiness, version });
}
function transitionState(viewIds, factory, current, requestedViewId, readinessRecords) {
  assertViewId(requestedViewId, viewIds);
  const readiness = normalizeReadiness(readinessRecords, viewIds);
  if (readiness[requestedViewId]?.readinessState !== READINESS_STATES.AVAILABLE) return deepFreeze({ state: current, activated: false });
  const state = factory(readinessRecords, { activeViewId: requestedViewId, version: (current?.version || 0) + 1 });
  return deepFreeze({ state, activated: true });
}
function refreshState(factory, current, readinessRecords) {
  const desired = current?.activeViewId || CONSUMER_IDS.WORKSPACE;
  const candidate = factory(readinessRecords, { activeViewId: desired, version: current?.version || 0 });
  if (sameEvidence(current, candidate)) return current;
  return deepFreeze({ ...candidate, version: (current?.version || 0) + 1 });
}
function validateState(value, schema, viewIds) {
  const errors = [];
  if (value?.schema !== schema) errors.push('Invalid application view-state schema.');
  if (!viewIds.includes(value?.activeViewId)) errors.push('Application active view is invalid.');
  if (!Array.isArray(value?.availableViewIds)) errors.push('Application available views are invalid.');
  if (!Number.isInteger(value?.version) || value.version < 0) errors.push('Application view-state version is invalid.');
  validateReadinessMap(value?.viewReadiness, viewIds, errors);
  const expectedAvailable = viewIds.filter((id) => value?.viewReadiness?.[id]?.readinessState === READINESS_STATES.AVAILABLE);
  if (canonicalStringify(value?.availableViewIds) !== canonicalStringify(expectedAvailable)) errors.push('Application available views do not match readiness.');
  if (!value?.availableViewIds?.includes(value?.activeViewId)) errors.push('Application active view is unavailable.');
  return deepFreeze({ ok: errors.length === 0, errors });
}
function validateReadinessMap(readiness, viewIds, errors) {
  const keys = readiness && typeof readiness === 'object' ? Object.keys(readiness).sort() : [];
  if (canonicalStringify(keys) !== canonicalStringify([...viewIds].sort())) errors.push('Application view readiness keys are incomplete.');
  const contextHashes = new Set();
  viewIds.forEach((id) => {
    const row = readiness?.[id];
    const validation = validateWorkspaceConsumerReadinessShape(row);
    if (row?.consumerId !== id || !validation.ok) errors.push(`Application readiness ${id} is invalid.`);
    if (typeof row?.contextSemanticHash === 'string' && row.contextSemanticHash) contextHashes.add(row.contextSemanticHash);
  });
  if (contextHashes.size !== 1) errors.push('Application view readiness must reference one consumer context.');
}
function normalizeReadiness(records, viewIds) {
  const matching = (records || []).filter((row) => viewIds.includes(row?.consumerId));
  if (matching.length !== viewIds.length || new Set(matching.map((row) => row.consumerId)).size !== viewIds.length) throw new TypeError(`${viewIds.join(', ')} readiness is required exactly once.`);
  matching.forEach((row) => {
    const validation = validateWorkspaceConsumerReadinessShape(row);
    if (!validation.ok) throw new TypeError(`Application readiness ${row?.consumerId || ''} is invalid: ${validation.errors.join(' ')}`);
  });
  if (new Set(matching.map((row) => row.contextSemanticHash)).size !== 1) throw new TypeError('Application readiness rows must reference one consumer context.');
  return deepFreeze(Object.fromEntries(matching.sort((a,b)=>a.consumerId.localeCompare(b.consumerId)).map((row)=>[row.consumerId,row])));
}
function sameEvidence(left, right) { return Boolean(left) && left.activeViewId === right.activeViewId && canonicalStringify(left.availableViewIds) === canonicalStringify(right.availableViewIds) && canonicalStringify(left.viewReadiness) === canonicalStringify(right.viewReadiness); }
function assertViewId(viewId, viewIds) { if (!viewIds.includes(viewId)) throw new TypeError(`Unknown application view: ${viewId}.`); }
