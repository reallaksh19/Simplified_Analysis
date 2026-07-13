import { buildDatasetHierarchy } from './dataset-hierarchy.js';
import { isPipeType, isSupportType, resolveEntityType, selectionTypeFor } from './dataset-types.js';
import {
  clonePlain,
  deterministicDatasetId,
  freezeDeep,
  isRecord,
  stringValue,
} from './dataset-utils.js';

export const WORKSPACE_DATASET_SCHEMA = 'analysis-workspace-dataset/v1';
const SELECTED_PACKAGE_SCHEMA = 'rvm-selected-geometry-workspace-package/v1';
const MANAGED_STAGE_SCHEMA = 'inputxml-managed-stage/v1';

export function normalizeWorkspaceDataset(rawPackage, sourceName = '') {
  const packageJson = normalizePackageRoot(rawPackage);
  const sourceSchema = stringValue(packageJson.schema) || inferSourceSchema(packageJson);
  const sourceItems = extractSourceItems(packageJson, sourceSchema);
  const entities = sourceItems.map(normalizeEntity);
  assertUniqueEntityIds(entities);

  const datasetId = deterministicDatasetId(packageJson, sourceName);
  const summary = summarizeEntities(entities);
  return freezeDeep({
    schema: WORKSPACE_DATASET_SCHEMA,
    datasetId,
    sourceSchema,
    sourceName: stringValue(sourceName),
    entities,
    hierarchy: buildDatasetHierarchy(entities),
    summary,
    source: clonePlain(packageJson.source || {}),
    axisTransform: clonePlain(packageJson.axisTransform || {}),
  });
}

function normalizePackageRoot(rawPackage) {
  if (Array.isArray(rawPackage)) {
    return { schema: MANAGED_STAGE_SCHEMA, objects: rawPackage };
  }
  if (!isRecord(rawPackage)) {
    throw new TypeError('Workspace import must be a JSON object or array.');
  }
  return rawPackage;
}

function inferSourceSchema(packageJson) {
  if (Array.isArray(packageJson.selected)) return 'json-viewer-selection/v1';
  if (Array.isArray(packageJson.objects)) return MANAGED_STAGE_SCHEMA;
  return 'unknown';
}

function extractSourceItems(packageJson, sourceSchema) {
  if (sourceSchema === SELECTED_PACKAGE_SCHEMA) {
    const geometry = packageJson.geometry;
    if (!isRecord(geometry)) throw new TypeError('Workspace package geometry must be an object.');
    return [
      ...arrayField(geometry.objects, 'geometry.objects'),
      ...arrayField(geometry.supports, 'geometry.supports'),
    ];
  }

  if (sourceSchema === MANAGED_STAGE_SCHEMA || Array.isArray(packageJson.selected)) {
    const roots = Array.isArray(packageJson.selected)
      ? packageJson.selected.map((entry) => entry?.item).filter(Boolean)
      : arrayField(packageJson.objects, 'objects');
    return flattenItems(roots);
  }

  throw new Error(`Unsupported workspace package schema: ${sourceSchema}.`);
}

function flattenItems(roots) {
  const items = [];
  const visit = (nodes) => {
    nodes.forEach((node) => {
      if (!isRecord(node)) return;
      items.push(node);
      if (Array.isArray(node.children)) visit(node.children);
    });
  };
  visit(roots);
  return items;
}

function normalizeEntity(item, index) {
  const entityType = resolveEntityType(item);
  const entityId = resolveEntityId(item, index);
  const name = stringValue(
    item.name
    || item.nodeName
    || item.sourceAttributes?.NAME
    || item.attributes?.NAME
    || entityId,
  );
  const sourcePath = stringValue(item.sourcePath || item.path || item.sourceAttributes?.PATH);

  return freezeDeep({
    entityId,
    name,
    entityType,
    selectionType: selectionTypeFor(entityType),
    sourcePath,
    category: isSupportType(entityType) ? 'support' : isPipeType(entityType) ? 'pipe' : 'component',
    properties: buildEntityProperties(item, { entityId, name, entityType, sourcePath }),
  });
}

function resolveEntityId(item, index) {
  const candidate = stringValue(
    item.sourceId
    || item.id
    || item.nodeId
    || item.sourceAttributes?.ID
    || item.attributes?.ID,
  );
  return candidate || `ENTITY-${index + 1}`;
}

function buildEntityProperties(item, identity) {
  return freezeDeep({
    identity,
    sourceAttributes: clonePlain(item.sourceAttributes || {}),
    attributes: clonePlain(item.attributes || {}),
    enrichedAttributes: clonePlain(item.enrichedAttributes || {}),
    nativeParams: clonePlain(item.nativeParams || {}),
    diagnostics: clonePlain(Array.isArray(item.diagnostics) ? item.diagnostics : []),
  });
}

function summarizeEntities(entities) {
  return freezeDeep({
    nodeCount: entities.length,
    pipes: entities.filter((entity) => entity.category === 'pipe').length,
    supports: entities.filter((entity) => entity.category === 'support').length,
    components: entities.filter((entity) => entity.category === 'component').length,
  });
}

function assertUniqueEntityIds(entities) {
  const ids = new Set();
  entities.forEach((entity) => {
    if (ids.has(entity.entityId)) {
      throw new Error(`Duplicate workspace entity ID: ${entity.entityId}.`);
    }
    ids.add(entity.entityId);
  });
}

function arrayField(value, fieldName) {
  if (!Array.isArray(value)) throw new TypeError(`Workspace field "${fieldName}" must be an array.`);
  return value;
}
