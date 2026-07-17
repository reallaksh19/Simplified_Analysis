import { canonicalStringify, deepFreeze } from '../shared-piping-model/index.js';
import { APPLICATION_VIEW_IDS, APPLICATION_VIEW_STATE_SCHEMA, CONSUMER_IDS, READINESS_STATES } from './constants.js';
import { validateWorkspaceConsumerReadinessShape } from './readiness.js';

export function createApplicationViewState(readinessRecords = [], options = {}) {
  const readiness = normalizeReadiness(readinessRecords);
  const availableViewIds = APPLICATION_VIEW_IDS.filter((id) => readiness[id]?.readinessState === READINESS_STATES.AVAILABLE);
  if (!availableViewIds.includes(CONSUMER_IDS.WORKSPACE)) throw new TypeError('Workspace view must be available.');
  const requested = options.activeViewId || CONSUMER_IDS.WORKSPACE;
  const activeViewId = availableViewIds.includes(requested) ? requested : CONSUMER_IDS.WORKSPACE;
  const version = Number.isInteger(options.version) && options.version >= 0 ? options.version : 0;
  return deepFreeze({ schema: APPLICATION_VIEW_STATE_SCHEMA, activeViewId, availableViewIds, viewReadiness: readiness, version });
}

export function transitionApplicationViewState(current, requestedViewId, readinessRecords) {
  assertViewId(requestedViewId);
  const readiness = normalizeReadiness(readinessRecords);
  if (readiness[requestedViewId]?.readinessState !== READINESS_STATES.AVAILABLE) return deepFreeze({ state: current, activated: false });
  const state = createApplicationViewState(readinessRecords, { activeViewId: requestedViewId, version: (current?.version || 0) + 1 });
  return deepFreeze({ state, activated: true });
}

export function refreshApplicationViewState(current, readinessRecords) {
  const desired = current?.activeViewId || CONSUMER_IDS.WORKSPACE;
  const candidate = createApplicationViewState(readinessRecords, { activeViewId: desired, version: current?.version || 0 });
  if (sameEvidence(current, candidate)) return current;
  return deepFreeze({ ...candidate, version: (current?.version || 0) + 1 });
}

export function validateApplicationViewState(value) {
  const errors = [];
  if (value?.schema !== APPLICATION_VIEW_STATE_SCHEMA) errors.push('Invalid application view-state schema.');
  if (!APPLICATION_VIEW_IDS.includes(value?.activeViewId)) errors.push('Application active view is invalid.');
  if (!Array.isArray(value?.availableViewIds)) errors.push('Application available views are invalid.');
  if (!Number.isInteger(value?.version) || value.version < 0) errors.push('Application view-state version is invalid.');
  const readiness = value?.viewReadiness;
  const keys = readiness && typeof readiness === 'object' ? Object.keys(readiness).sort() : [];
  if (canonicalStringify(keys) !== canonicalStringify([...APPLICATION_VIEW_IDS].sort())) errors.push('Application view readiness keys are incomplete.');
  const contextHashes = new Set();
  APPLICATION_VIEW_IDS.forEach((id) => {
    const row = readiness?.[id];
    const validation = validateWorkspaceConsumerReadinessShape(row);
    if (row?.consumerId !== id || !validation.ok) errors.push(`Application readiness ${id} is invalid.`);
    if (typeof row?.contextSemanticHash === 'string' && row.contextSemanticHash) contextHashes.add(row.contextSemanticHash);
  });
  if (contextHashes.size !== 1) errors.push('Application view readiness must reference one consumer context.');
  const expectedAvailable = APPLICATION_VIEW_IDS.filter((id) => readiness?.[id]?.readinessState === READINESS_STATES.AVAILABLE);
  if (canonicalStringify(value?.availableViewIds) !== canonicalStringify(expectedAvailable)) errors.push('Application available views do not match readiness.');
  if (!value?.availableViewIds?.includes(value?.activeViewId)) errors.push('Application active view is unavailable.');
  return deepFreeze({ ok: errors.length === 0, errors });
}
export function assertApplicationViewId(viewId) { assertViewId(viewId); }
function normalizeReadiness(records) {
  const matching = (records || []).filter((row) => APPLICATION_VIEW_IDS.includes(row?.consumerId));
  if (matching.length !== APPLICATION_VIEW_IDS.length || new Set(matching.map((row) => row.consumerId)).size !== APPLICATION_VIEW_IDS.length) throw new TypeError('Workspace and Reports readiness are required exactly once.');
  matching.forEach((row) => {
    const validation = validateWorkspaceConsumerReadinessShape(row);
    if (!validation.ok) throw new TypeError(`Application readiness ${row?.consumerId || ''} is invalid: ${validation.errors.join(' ')}`);
  });
  if (new Set(matching.map((row) => row.contextSemanticHash)).size !== 1) throw new TypeError('Application readiness rows must reference one consumer context.');
  return deepFreeze(Object.fromEntries(matching.sort((a,b)=>a.consumerId.localeCompare(b.consumerId)).map((row)=>[row.consumerId,row])));
}
function sameEvidence(left, right) {
  if (!left) return false;
  return left.activeViewId === right.activeViewId && canonicalStringify(left.availableViewIds) === canonicalStringify(right.availableViewIds) && canonicalStringify(left.viewReadiness) === canonicalStringify(right.viewReadiness);
}
function assertViewId(viewId) { if (!APPLICATION_VIEW_IDS.includes(viewId)) throw new TypeError(`Unknown application view: ${viewId}.`); }
