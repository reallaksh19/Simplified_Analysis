import { canonicalStringify, deepFreeze, semanticHash } from '../shared-piping-model/index.js';
import {
  APPLICATION_NAVIGATION_ORDER_V5,
  READINESS_STATES,
  validateWorkspaceConsumerContext,
  validateWorkspaceConsumerReadinessShape,
  validateWorkspaceConsumerRegistryV5,
} from '../workspace-consumers/index.js';
import { WORKSPACE_HOME_APPLICATION_TITLE, WORKSPACE_HOME_SOURCE_SCHEMA } from './constants.js';

export function createWorkspaceHomeSource(input = {}) {
  const registry = input.registry;
  const context = input.context;
  const readiness = input.readiness;
  assertInput(registry, context, readiness);
  const descriptors = new Map(registry.consumers.map((row) => [row.consumerId, row]));
  const readinessById = new Map(readiness.map((row) => [row.consumerId, row]));
  const tabs = APPLICATION_NAVIGATION_ORDER_V5.map((consumerId) => tabSource(descriptors.get(consumerId), readinessById.get(consumerId)));
  const base = {
    schema: WORKSPACE_HOME_SOURCE_SCHEMA,
    applicationTitle: WORKSPACE_HOME_APPLICATION_TITLE,
    datasetStatus: context.datasetId ? 'READY' : 'EMPTY',
    datasetId: context.datasetId,
    tabs,
  };
  return deepFreeze({ ...base, semanticHash: semanticHash(base) });
}

export function validateWorkspaceHomeSource(value) {
  const errors = [];
  if (value?.schema !== WORKSPACE_HOME_SOURCE_SCHEMA) errors.push('Invalid Workspace Home source schema.');
  if (value?.applicationTitle !== WORKSPACE_HOME_APPLICATION_TITLE) errors.push('Workspace Home application title is invalid.');
  if (!['EMPTY', 'READY'].includes(value?.datasetStatus)) errors.push('Workspace Home dataset status is invalid.');
  if (value?.datasetId !== null && (typeof value?.datasetId !== 'string' || !value.datasetId.trim())) errors.push('Workspace Home dataset identity is invalid.');
  if ((value?.datasetStatus === 'READY') !== Boolean(value?.datasetId)) errors.push('Workspace Home dataset status does not match its identity.');
  validateTabs(value?.tabs, errors);
  if (value?.semanticHash !== semanticHash(withoutHash(value))) errors.push('Workspace Home source semantic hash mismatch.');
  return deepFreeze({ ok: errors.length === 0, errors });
}

function assertInput(registry, context, readiness) {
  const registryValidation = validateWorkspaceConsumerRegistryV5(registry);
  if (!registryValidation.ok) throw new TypeError(`Workspace Home requires registry v5: ${registryValidation.errors.join(' ')}`);
  const contextValidation = validateWorkspaceConsumerContext(context);
  if (!contextValidation.ok) throw new TypeError(`Workspace Home context is invalid: ${contextValidation.errors.join(' ')}`);
  if (!Array.isArray(readiness) || readiness.length !== APPLICATION_NAVIGATION_ORDER_V5.length) throw new TypeError('Workspace Home requires readiness for all application tabs.');
  const ids = readiness.map((row) => row?.consumerId);
  if (new Set(ids).size !== APPLICATION_NAVIGATION_ORDER_V5.length || APPLICATION_NAVIGATION_ORDER_V5.some((id) => !ids.includes(id))) throw new TypeError('Workspace Home readiness identities are incomplete.');
  readiness.forEach((row) => {
    const validation = validateWorkspaceConsumerReadinessShape(row);
    if (!validation.ok) throw new TypeError(`Workspace Home readiness ${row?.consumerId || ''} is invalid: ${validation.errors.join(' ')}`);
    if (row.contextSemanticHash !== context.semanticHash) throw new TypeError('Workspace Home readiness must reference the current consumer context.');
  });
}

function tabSource(descriptor, readiness) {
  if (!descriptor || !readiness) throw new TypeError('Workspace Home tab evidence is incomplete.');
  const diagnostic = readiness.diagnostics[0] || null;
  return deepFreeze({
    consumerId: descriptor.consumerId,
    label: descriptor.label,
    purpose: descriptor.purpose,
    implementationStatus: descriptor.implementationStatus,
    readinessState: readiness.readinessState,
    available: readiness.readinessState === READINESS_STATES.AVAILABLE,
    diagnosticCode: diagnostic?.code || null,
    diagnosticMessage: diagnostic?.message || null,
  });
}

function validateTabs(tabs, errors) {
  if (!Array.isArray(tabs) || tabs.length !== APPLICATION_NAVIGATION_ORDER_V5.length) {
    errors.push('Workspace Home tabs are incomplete.');
    return;
  }
  const ids = tabs.map((row) => row?.consumerId);
  if (canonicalStringify(ids) !== canonicalStringify(APPLICATION_NAVIGATION_ORDER_V5)) errors.push('Workspace Home tab order is invalid.');
  tabs.forEach((row) => {
    if (!row || typeof row.label !== 'string' || !row.label || typeof row.purpose !== 'string' || !row.purpose) errors.push('Workspace Home tab text is invalid.');
    if (typeof row?.available !== 'boolean') errors.push('Workspace Home tab availability is invalid.');
    if (row?.available !== (row?.readinessState === READINESS_STATES.AVAILABLE)) errors.push('Workspace Home tab availability does not match readiness.');
    if (row?.diagnosticCode !== null && (typeof row.diagnosticCode !== 'string' || !row.diagnosticCode)) errors.push('Workspace Home tab diagnostic code is invalid.');
    if (row?.diagnosticMessage !== null && (typeof row.diagnosticMessage !== 'string' || !row.diagnosticMessage)) errors.push('Workspace Home tab diagnostic message is invalid.');
  });
}
function withoutHash(value) { const { semanticHash: _hash, ...base } = value || {}; return base; }
