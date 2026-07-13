import { clonePlain, freezeDeep, isRecord, stringValue } from './dataset-utils.js';

export const STAGED_MODEL_INDEX_SCHEMA = 'staged-model-index/v1';
const SELECTED_PACKAGE_SCHEMA = 'rvm-selected-geometry-workspace-package/v1';
const MANAGED_STAGE_SCHEMA = 'inputxml-managed-stage/v1';

export function indexWorkspaceSourcePackage(packageJson, sourceSchema) {
  const roots = sourceRoots(packageJson, sourceSchema);
  const nodes = [];
  const entries = [];
  const rootNodeIds = [];
  let ordinal = 0;

  const visit = (item, parentNodeId, childIndex, depth, inheritedPath, rootGroup) => {
    if (!isRecord(item)) return null;
    const nodeId = `source-node-${ordinal + 1}`;
    const entityId = sourceEntityId(item, ordinal);
    const name = sourceName(item, entityId);
    const sourcePath = sourcePathFor(item, inheritedPath, name);
    const node = {
      nodeId,
      entityId,
      parentNodeId,
      childIndex,
      depth,
      rootGroup,
      name,
      type: sourceType(item),
      sourcePath,
      childNodeIds: [],
    };
    ordinal += 1;
    nodes.push(node);
    entries.push({ item, node });
    if (!parentNodeId) rootNodeIds.push(nodeId);

    const children = Array.isArray(item.children) ? item.children : [];
    children.forEach((child, index) => {
      const childNode = visit(child, nodeId, index, depth + 1, sourcePath, rootGroup);
      if (childNode) node.childNodeIds.push(childNode.nodeId);
    });
    return node;
  };

  roots.forEach(({ item, rootGroup }, index) => visit(item, '', index, 0, '', rootGroup));

  const model = freezeDeep({
    schema: STAGED_MODEL_INDEX_SCHEMA,
    sourceSchema,
    sourcePackage: clonePlain(packageJson),
    sourceTree: clonePlain(roots.map(({ item }) => item)),
    rootNodeIds,
    nodes,
    summary: {
      nodeCount: nodes.length,
      rootCount: rootNodeIds.length,
      supportCount: nodes.filter((node) => isSupportType(node.type)).length,
    },
  });
  return { entries, model };
}

function sourceRoots(packageJson, sourceSchema) {
  if (sourceSchema === SELECTED_PACKAGE_SCHEMA) {
    const geometry = packageJson.geometry;
    if (!isRecord(geometry)) throw new TypeError('Workspace package geometry must be an object.');
    return [
      ...arrayField(geometry.objects, 'geometry.objects').map((item) => ({ item, rootGroup: 'objects' })),
      ...arrayField(geometry.supports, 'geometry.supports').map((item) => ({ item, rootGroup: 'supports' })),
    ];
  }
  if (sourceSchema === MANAGED_STAGE_SCHEMA || Array.isArray(packageJson.selected)) {
    const roots = Array.isArray(packageJson.selected)
      ? packageJson.selected.map((entry) => entry?.item).filter(Boolean)
      : arrayField(packageJson.objects, 'objects');
    return roots.map((item) => ({ item, rootGroup: 'staged' }));
  }
  throw new Error(`Unsupported workspace package schema: ${sourceSchema}.`);
}

function sourceEntityId(item, index) {
  return stringValue(
    item.sourceId
    || item.id
    || item.nodeId
    || item.sourceAttributes?.ID
    || item.attributes?.ID,
  ) || `ENTITY-${index + 1}`;
}

function sourceName(item, entityId) {
  return stringValue(
    item.name
    || item.nodeName
    || item.sourceAttributes?.NAME
    || item.attributes?.NAME,
  ) || entityId;
}

function sourceType(item) {
  return stringValue(
    item.type
    || item.kind
    || item.sourceAttributes?.TYPE
    || item.attributes?.TYPE
    || item.nativeParams?.role,
  ).toUpperCase() || 'OBJECT';
}

function sourcePathFor(item, inheritedPath, name) {
  const explicit = stringValue(item.sourcePath || item.path || item.sourceAttributes?.PATH);
  if (explicit) return explicit;
  const parent = stringValue(inheritedPath).replace(/\/$/, '');
  return `${parent}/${name}`;
}

function isSupportType(type) {
  return /^(ATTA|SUPPORT|REST|GUIDE|LINESTOP|LINE_STOP|LIMIT|LIM|ANCHOR|SPRING)$/i.test(type);
}

function arrayField(value, fieldName) {
  if (!Array.isArray(value)) throw new TypeError(`Workspace field "${fieldName}" must be an array.`);
  return value;
}
