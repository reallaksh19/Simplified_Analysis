import { createDiagnostic, DIAGNOSTIC_SEVERITY, normalizeDiagnosticRows } from '../diagnostics.js';
import { collectEvidence, normalizeGeometryEvidence, normalizePoint } from '../evidence.js';
import { deepFreeze, isPlainRecord, stringValue } from '../immutable.js';
import { COMPATIBILITY_EVIDENCE_SPECS, ENGINEERING_PROPERTY_SPECS } from '../property-specs.js';
import { createSharedPipingModel } from '../shared-piping-model.js';

const WORKSPACE_DATASET_SCHEMA = 'analysis-workspace-dataset/v1';
const CONTAINER_TYPES = new Set(['BRANCH', 'GROUP', 'MODEL', 'ROOT', 'FOLDER', 'SYSTEM', 'ZONE']);

export function buildSharedPipingModelFromWorkspaceDataset(dataset) {
  assertWorkspaceDataset(dataset);
  const state = { components: [], supports: [], diagnostics: initialDiagnostics(dataset) };
  dataset.entities.forEach((entity) => addWorkspaceEntity(entity, state));
  return createSharedPipingModel({
    project: workspaceProject(dataset), units: workspaceUnits(dataset),
    sourceSnapshotRef: snapshotReference(dataset.sourceSnapshot),
    components: state.components, supports: state.supports,
    sourceReferences: { nodes: sourceNodeReferences(dataset.sourceModel) },
    diagnostics: state.diagnostics,
  });
}

function addWorkspaceEntity(entity, state) {
  if (CONTAINER_TYPES.has(normalizedType(entity.entityType))) {
    state.diagnostics.push(containerDiagnostic(entity));
    return;
  }
  const evidence = collectEntityEvidence(entity);
  const sourceDiagnostics = normalizeDiagnosticRows(entity.properties?.diagnostics, entity.entityId);
  const diagnostics = [...evidence.diagnostics, ...sourceDiagnostics];
  state.diagnostics.push(...diagnostics);
  if (entity.category === 'support') state.supports.push(workspaceSupport(entity, evidence, diagnostics));
  else state.components.push(workspaceComponent(entity, evidence, diagnostics));
}

function workspaceComponent(entity, evidence, diagnostics) {
  const geometry = normalizeGeometryEvidence(entity.properties?.geometry, entity.sourcePath);
  return deepFreeze({
    componentKey: entity.entityId,
    sourceEntityId: entity.sourceEntityId ?? null,
    name: entity.name,
    type: normalizedType(entity.entityType),
    identity: entityIdentity(entity),
    geometry: { ...geometry, ports: componentPorts(entity.entityId, geometry) },
    engineeringProperties: evidence.engineering.values,
    compatibilityEvidence: evidence.compatibility.values,
    sourceReferences: entitySourceReferences(entity),
    diagnostics,
  });
}

function workspaceSupport(entity, evidence, diagnostics) {
  const geometry = normalizeGeometryEvidence(entity.properties?.geometry, entity.sourcePath);
  return deepFreeze({
    supportKey: entity.entityId,
    sourceEntityId: entity.sourceEntityId ?? null,
    name: entity.name,
    type: normalizedType(entity.entityType),
    identity: entityIdentity(entity),
    position: supportPosition(entity, geometry),
    engineeringProperties: evidence.engineering.values,
    compatibilityEvidence: evidence.compatibility.values,
    sourceReferences: entitySourceReferences(entity),
    diagnostics,
  });
}

function supportPosition(entity, geometry) {
  const properties = entity.properties || {};
  return geometry.center
    || geometry.start
    || normalizePoint(properties.sourceAttributes?.POS)
    || normalizePoint(properties.attributes?.POS)
    || normalizePoint(properties.nativeParams?.center)
    || null;
}

function collectEntityEvidence(entity) {
  const roots = entityRoots(entity);
  const engineering = collectEvidence(ENGINEERING_PROPERTY_SPECS, roots, entity.entityId);
  const compatibility = collectEvidence(COMPATIBILITY_EVIDENCE_SPECS, roots, entity.entityId);
  const diagnostics = [...engineering.diagnostics, ...compatibility.diagnostics];
  return { engineering, compatibility, diagnostics };
}

function entityRoots(entity) {
  const properties = entity.properties || {};
  return [
    ['sourceAttributes', properties.sourceAttributes],
    ['attributes', properties.attributes],
    ['enrichedAttributes', properties.enrichedAttributes],
    ['nativeParams', properties.nativeParams],
  ];
}

function componentPorts(componentKey, geometry) {
  const ports = [];
  if (geometry.start) ports.push(port(componentKey, 'start', geometry.start, geometry.sources?.start));
  if (geometry.end) ports.push(port(componentKey, 'end', geometry.end, geometry.sources?.end));
  geometry.branchPoints.forEach((point, index) => ports.push(port(componentKey, `branch-${index + 1}`, point, geometry.sources?.branches?.[index])));
  return ports;
}

function port(componentKey, role, position, sourcePath) {
  return deepFreeze({
    portKey: `${componentKey}:port:${role}`,
    role,
    position,
    sourceReference: sourcePath ? { sourcePath } : null,
  });
}

function entityIdentity(entity) {
  return deepFreeze({
    lineId: stringValue(entity.lineId), branchId: stringValue(entity.branchId),
    systemId: stringValue(entity.systemId), zoneId: stringValue(entity.zoneId),
  });
}

function entitySourceReferences(entity) {
  return deepFreeze({
    sourceNodeKey: stringValue(entity.sourceNodeKey || entity.sourceNodeId),
    sourceEntityId: entity.sourceEntityId ?? null,
    jsonPointer: stringValue(entity.jsonPointer),
    sourcePath: stringValue(entity.sourcePath),
  });
}

function sourceNodeReferences(sourceModel) {
  return (sourceModel?.nodes || []).map((node) => ({
    sourceNodeKey: node.sourceNodeKey,
    sourceEntityId: node.sourceEntityId,
    jsonPointer: node.jsonPointer,
    parentSourceNodeKey: node.parentSourceNodeKey,
    childSourceNodeKeys: node.childSourceNodeKeys,
    childIndex: node.childIndex,
    depth: node.depth,
    type: node.type,
    name: node.name,
    sourcePath: node.sourcePath,
    lineId: node.lineId,
    branchId: node.branchId,
    systemId: node.systemId,
    zoneId: node.zoneId,
  }));
}

function initialDiagnostics(dataset) {
  const diagnostics = [
    ...normalizeDiagnosticRows(dataset.sourceSnapshot?.diagnostics, 'sourceSnapshot'),
    ...normalizeDiagnosticRows(dataset.sourceModel?.diagnostics, 'sourceModel'),
  ];
  if (workspaceUnits(dataset).length === 'unknown') diagnostics.push(createDiagnostic(
    'WORKSPACE_LENGTH_UNIT_UNKNOWN',
    'Workspace length unit is unavailable; unknown is retained without inventing a unit.',
    { severity: DIAGNOSTIC_SEVERITY.ERROR, scope: 'units.length' },
  ));
  return diagnostics;
}

function containerDiagnostic(entity) {
  return createDiagnostic('SOURCE_CONTAINER_EXCLUDED', 'Non-physical source container is retained as provenance, not a shared component.', {
    severity: DIAGNOSTIC_SEVERITY.INFO,
    scope: entity.entityId,
    sourceNodeKey: entity.sourceNodeKey || entity.sourceNodeId,
    type: normalizedType(entity.entityType),
  });
}

function workspaceProject(dataset) {
  return { datasetId: dataset.datasetId, name: dataset.sourceName || dataset.datasetId, sourceName: dataset.sourceName };
}

function workspaceUnits(dataset) {
  const source = dataset.sourceSnapshot?.sourcePackage || {};
  const unit = stringValue(source.unit || source.units?.length || source.project?.units?.length || 'unknown');
  return { length: unit, force: stringValue(source.units?.force || 'unknown'), mass: stringValue(source.units?.mass || 'unknown') };
}

function snapshotReference(snapshot) {
  if (!isPlainRecord(snapshot)) throw new TypeError('Workspace dataset requires SourcePackageSnapshot.v1.');
  const { schema, datasetId, sourceSchema, sourceSemanticHash, sourceByteHash } = snapshot;
  return { schema, datasetId, sourceSchema, sourceSemanticHash, sourceByteHash };
}

function normalizedType(value) {
  return stringValue(value).toUpperCase() || 'OBJECT';
}

function assertWorkspaceDataset(dataset) {
  if (!dataset || dataset.schema !== WORKSPACE_DATASET_SCHEMA || !Array.isArray(dataset.entities)) {
    throw new TypeError(`Workspace adapter requires ${WORKSPACE_DATASET_SCHEMA}.`);
  }
}
