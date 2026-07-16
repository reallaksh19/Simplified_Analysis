import { deepFreeze, semanticHash } from '../shared-piping-model/index.js';
import { CONSUMER_IDS, IMPLEMENTATION_STATUS, REGISTRY_SCHEMA } from './constants.js';

const DESCRIPTORS = [
  descriptor('WORKSPACE', 'Workspace', 'Author and inspect the current model workspace.', 'IMPLEMENTED', [], [], ['NAVIGATE'], 'No engineering qualification claim.'),
  descriptor('REPORTS', 'Reports', 'Review an active archived model calculation report.', 'IMPLEMENTED', ['modelCalculationLedger', 'activeModelCalculationPackage', 'activeModelCalculationReport'], [], ['NAVIGATE', 'SELECT_ARCHIVE', 'EXPORT_JSON', 'EXPORT_CSV', 'EXPORT_MARKDOWN'], 'Displays archived evidence only; not code compliance.'),
  descriptor('LOAD_CALC', 'Load Calc', 'Future load calculation consumer.', 'NOT_IMPLEMENTED', ['loadCaseSet', 'loadPrimitiveSet'], [], [], 'No implementation or engineering claim.'),
  descriptor('THREE_D_CALC', '3D Calc', 'Future three-dimensional calculation consumer.', 'NOT_IMPLEMENTED', ['sharedModel', 'topologyGraph'], [], [], 'No implementation or engineering claim.'),
  descriptor('PIPE_SOLVER', 'Pipe Solver', 'Future piping solver consumer.', 'NOT_IMPLEMENTED', ['sharedModel', 'topologyGraph', 'restraintCapabilityModel'], [], [], 'No implementation or engineering claim.'),
  descriptor('QA', 'QA', 'Future model evidence quality consumer.', 'NOT_IMPLEMENTED', ['sharedModel'], [], [], 'No implementation or engineering claim.'),
  descriptor('DEBUG', 'Debug', 'Future diagnostic evidence consumer.', 'NOT_IMPLEMENTED', [], ['topologyAudit', 'modelLoadReadinessAudit'], [], 'No implementation or engineering claim.'),
];

export function createWorkspaceConsumerRegistry(descriptors = DESCRIPTORS) {
  const consumers = [...descriptors].map(normalize).sort((a, b) => a.consumerId.localeCompare(b.consumerId));
  assertClosed(consumers);
  const base = { schema: REGISTRY_SCHEMA, consumers };
  return deepFreeze({ ...base, semanticHash: semanticHash(base) });
}

export function getConsumerDescriptor(registry, consumerId) {
  assertConsumerId(consumerId);
  return registry.consumers.find((row) => row.consumerId === consumerId);
}

export function assertConsumerId(consumerId) {
  if (!CONSUMER_IDS.includes(consumerId)) throw new RangeError(`Unknown workspace consumer: ${consumerId}`);
}

function descriptor(consumerId, label, purpose, implementationStatus, requiredContractKeys, optionalContractKeys, allowedActions, engineeringClaimPolicy) {
  return { consumerId, label, purpose, implementationStatus, requiredContractKeys, optionalContractKeys, allowedActions, engineeringClaimPolicy };
}
function normalize(value) {
  return { ...value, requiredContractKeys: [...value.requiredContractKeys].sort(), optionalContractKeys: [...value.optionalContractKeys].sort(), allowedActions: [...value.allowedActions].sort() };
}
function assertClosed(consumers) {
  if (consumers.length !== CONSUMER_IDS.length) throw new TypeError('Consumer registry must contain the closed consumer set.');
  CONSUMER_IDS.forEach((id) => { if (!consumers.some((row) => row.consumerId === id)) throw new TypeError(`Missing consumer descriptor: ${id}`); });
  consumers.forEach((row) => { if (!Object.values(IMPLEMENTATION_STATUS).includes(row.implementationStatus)) throw new TypeError(`Invalid implementation status: ${row.consumerId}`); });
}