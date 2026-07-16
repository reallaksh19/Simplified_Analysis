import { deepFreeze } from '../shared-piping-model/index.js';
import {
  APPLICATION_VIEW_IDS,
  APPLICATION_VIEW_STATE_SCHEMA,
  READINESS_STATES,
} from './constants.js';

export function createApplicationViewState(readinessRecords = [], options = {}) {
  const readiness = normalizeReadiness(readinessRecords);
  const availableViewIds = APPLICATION_VIEW_IDS.filter((viewId) => readiness[viewId]?.readinessState === READINESS_STATES.AVAILABLE);
  const requested = options.activeViewId || 'WORKSPACE';
  const activeViewId = availableViewIds.includes(requested) ? requested : 'WORKSPACE';
  const version = Number.isInteger(options.version) && options.version >= 0 ? options.version : 0;
  return deepFreeze({
    schema: APPLICATION_VIEW_STATE_SCHEMA,
    activeViewId,
    availableViewIds,
    viewReadiness: readiness,
    version,
  });
}

export function transitionApplicationViewState(current, requestedViewId, readinessRecords) {
  assertViewId(requestedViewId);
  const next = createApplicationViewState(readinessRecords, {
    activeViewId: requestedViewId,
    version: (current?.version || 0) + 1,
  });
  const activated = next.activeViewId === requestedViewId;
  return deepFreeze({ state: activated ? next : refreshApplicationViewState(current, readinessRecords), activated });
}

export function refreshApplicationViewState(current, readinessRecords) {
  const desired = current?.activeViewId || 'WORKSPACE';
  const next = createApplicationViewState(readinessRecords, {
    activeViewId: desired,
    version: (current?.version || 0) + 1,
  });
  return next;
}

export function validateApplicationViewState(value) {
  const errors = [];
  if (value?.schema !== APPLICATION_VIEW_STATE_SCHEMA) errors.push('Invalid application view-state schema.');
  if (!APPLICATION_VIEW_IDS.includes(value?.activeViewId)) errors.push('Application active view is invalid.');
  if (!Array.isArray(value?.availableViewIds)) errors.push('Application available views are invalid.');
  if (!value?.viewReadiness || typeof value.viewReadiness !== 'object') errors.push('Application view readiness is invalid.');
  if (!Number.isInteger(value?.version) || value.version < 0) errors.push('Application view-state version is invalid.');
  return deepFreeze({ ok: errors.length === 0, errors });
}

export function assertApplicationViewId(viewId) { assertViewId(viewId); }

function normalizeReadiness(records) {
  const byId = Object.fromEntries((records || []).filter((row) => APPLICATION_VIEW_IDS.includes(row.consumerId))
    .sort((left, right) => left.consumerId.localeCompare(right.consumerId))
    .map((row) => [row.consumerId, row]));
  return deepFreeze(byId);
}
function assertViewId(viewId) {
  if (!APPLICATION_VIEW_IDS.includes(viewId)) throw new TypeError(`Unknown application view: ${viewId}.`);
}
