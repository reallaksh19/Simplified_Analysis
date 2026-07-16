import { deepFreeze } from '../shared-piping-model/index.js';
import { READINESS_STATES, VIEW_STATE_SCHEMA } from './constants.js';

export function createApplicationViewState(readinessById, activeViewId = 'WORKSPACE', version = 0) {
  const availableViewIds = ['WORKSPACE', 'REPORTS'].filter((id) => readinessById[id]?.readinessState === READINESS_STATES.AVAILABLE);
  const resolvedActive = availableViewIds.includes(activeViewId) ? activeViewId : 'WORKSPACE';
  return deepFreeze({
    schema: VIEW_STATE_SCHEMA,
    activeViewId: resolvedActive,
    availableViewIds,
    viewReadiness: deepFreeze(Object.fromEntries(['WORKSPACE', 'REPORTS'].map((id) => [id, readinessById[id]?.readinessState ?? READINESS_STATES.MISSING]))),
    version: Number.isInteger(version) && version >= 0 ? version : 0,
  });
}

export function activateApplicationViewState(state, viewId, readiness) {
  if (!['WORKSPACE', 'REPORTS'].includes(viewId)) throw new RangeError(`Unknown application view: ${viewId}`);
  if (readiness.readinessState !== READINESS_STATES.AVAILABLE) return state;
  if (state.activeViewId === viewId) return state;
  return deepFreeze({ ...state, activeViewId: viewId, version: state.version + 1 });
}

export function validateApplicationViewState(value) {
  const ok = value?.schema === VIEW_STATE_SCHEMA && ['WORKSPACE', 'REPORTS'].includes(value.activeViewId);
  return deepFreeze({ ok, errors: ok ? [] : ['invalid application view state'] });
}