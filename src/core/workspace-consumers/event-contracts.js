import {
  APPLICATION_VIEW_IDS_V3,
  CONSUMER_IDS,
  createWorkspaceConsumerRegistry,
  validateApplicationViewStateAny,
  validateWorkspaceConsumerContext,
  validateWorkspaceConsumerReadiness,
} from './index.js';

const REQUEST_SOURCES = new Set(['api', 'navigation']);
const CONSUMER_ID_SET = new Set(Object.values(CONSUMER_IDS));

export function validateApplicationViewChangeRequested(payload) {
  assertExactRecord(payload, ['source', 'viewId'], 'applicationView:changeRequested');
  if (!CONSUMER_ID_SET.has(payload.viewId)) throw new TypeError('applicationView:changeRequested payload.viewId is invalid.');
  if (!REQUEST_SOURCES.has(payload.source)) throw new TypeError('applicationView:changeRequested payload.source is invalid.');
}

export function validateApplicationViewChanged(payload) {
  assertExactRecord(payload, ['previousViewId', 'reason', 'state'], 'applicationView:changed');
  if (!APPLICATION_VIEW_IDS_V3.includes(payload.previousViewId)) throw new TypeError('applicationView:changed payload.previousViewId is invalid.');
  assertNonEmpty(payload.reason, 'applicationView:changed payload.reason');
  const validation = validateApplicationViewStateAny(payload.state);
  if (!validation.ok) throw new TypeError(`applicationView:changed payload.state is invalid: ${validation.errors.join(' ')}`);
}

export function validateApplicationViewChangeFailed(payload) {
  assertExactRecord(payload, ['activeViewId', 'code', 'message', 'viewId'], 'applicationView:changeFailed');
  if (!CONSUMER_ID_SET.has(payload.viewId)) throw new TypeError('applicationView:changeFailed payload.viewId is invalid.');
  if (!APPLICATION_VIEW_IDS_V3.includes(payload.activeViewId)) throw new TypeError('applicationView:changeFailed payload.activeViewId is invalid.');
  assertNonEmpty(payload.code, 'applicationView:changeFailed payload.code');
  assertNonEmpty(payload.message, 'applicationView:changeFailed payload.message');
}

export function validateWorkspaceConsumerContextChanged(payload) {
  assertExactRecord(payload, ['context', 'readiness', 'reason'], 'workspaceConsumerContext:changed');
  const contextValidation = validateWorkspaceConsumerContext(payload.context);
  if (!contextValidation.ok) throw new TypeError(`workspaceConsumerContext:changed payload.context is invalid: ${contextValidation.errors.join(' ')}`);
  if (!Array.isArray(payload.readiness)) throw new TypeError('workspaceConsumerContext:changed payload.readiness must be an array.');
  const registry = createWorkspaceConsumerRegistry();
  const expectedIds = registry.consumers.map((row) => row.consumerId).sort();
  const actualIds = payload.readiness.map((row) => row?.consumerId).sort();
  if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) throw new TypeError('workspaceConsumerContext:changed readiness IDs are invalid.');
  payload.readiness.forEach((row) => {
    const validation = validateWorkspaceConsumerReadiness(row, registry, payload.context, { workspaceBooted: true });
    if (!validation.ok) throw new TypeError(`workspaceConsumerContext:changed readiness ${row?.consumerId || ''} is invalid: ${validation.errors.join(' ')}`);
  });
  assertNonEmpty(payload.reason, 'workspaceConsumerContext:changed payload.reason');
}

function assertExactRecord(value, keys, topic) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${topic} payload must be an object.`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new TypeError(`${topic} payload fields are invalid.`);
}
function assertNonEmpty(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} must be a non-empty string.`);
}
