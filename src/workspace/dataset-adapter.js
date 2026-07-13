import { buildDatasetHierarchy } from './dataset-hierarchy.js';
import { isPipeType, isSupportType, resolveEntityType, selectionTypeFor } from './dataset-types.js';
import { extractGeometryEvidence } from './geometry-evidence.js';
import { indexWorkspaceSourcePackage } from './staged-model-index.js';
import {
  clonePlain,
  deterministicDatasetId,
  freezeDeep,
  isRecord,
  stringValue,
} from './dataset-utils.js';

export const WORKSPACE_DATASET_SCHEMA = 'analysis-workspace-dataset/v1';
const MANAGED_STAGE_SCHEMA = 'inputxml-managed-stage/v1';

export function normalizeWorkspaceDataset(rawPackage, sourceName = '') {
  const packageJson = normalizePackageRoot(rawPackage);
  const sourceSchema = stringValue(packageJson.schema) || inferSourceSchema(packageJson);
  const indexed = indexWorkspaceSourcePackage(packageJson, sourceSchema);
  const entities = indexed.entries.map(normalizeEntity);
  assertUniqueEntityIds(entities);

  const datasetId = deterministicDatasetId(packageJson, sourceName);
  const summary = summarizeEntities(entities, indexed.model);
  return freezeDeep({
    schema: WORKSPACE_DATASET_SCHEMA,
    datasetId,
    sourceSchema,
    sourceName: stringValue(sourceName),
    entities,
    hierarchy: buildDatasetHierarchy(entities),
    sourceModel: indexed.model,
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

function normalizeEntity({ item, node }) {
  const entityType = resolveEntityType(item);
  const entityId = node.entityId;
  const name = node.name;
  const sourcePath = node.sourcePath;

  return freezeDeep({
    entityId,
    name,
    entityType,
    selectionType: selectionTypeFor(entityType),
    sourcePath,
    sourceNodeId: node.nodeId,
    parentSourceNodeId: node.parentNodeId,
    sourceChildIndex: node.childIndex,
    sourceDepth: node.depth,
    sourceRootGroup: node.rootGroup,
    category: isSupportType(entityType) ? 'support' : isPipeType(entityType) ? 'pipe' : 'component',
    properties: buildEntityProperties(item, { entityId, name, entityType, sourcePath }),
  });
}

function buildEntityProperties(item, identity) {
  return freezeDeep({
    identity,
    geometry: extractGeometryEvidence(item),
    sourceAttributes: clonePlain(item.sourceAttributes || {}),
    attributes: clonePlain(item.attributes || {}),
    enrichedAttributes: clonePlain(item.enrichedAttributes || {}),
    nativeParams: clonePlain(item.nativeParams || {}),
    diagnostics: clonePlain(Array.isArray(item.diagnostics) ? item.diagnostics : []),
  });
}

function summarizeEntities(entities, sourceModel) {
  return freezeDeep({
    nodeCount: entities.length,
    sourceNodeCount: sourceModel.summary.nodeCount,
    sourceRootCount: sourceModel.summary.rootCount,
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
