/**
 * Functionality: validates and normalizes the selected-geometry workspace
 * package exported by 3D_Viewer. Parameters: raw package JSON, import source,
 * and import timestamp. Outputs: immutable workspace data plus summary counts.
 * Fallback: invalid package shape raises explicit errors before any store update.
 */

export const RVM_SELECTED_GEOMETRY_WORKSPACE_PACKAGE_SCHEMA = 'rvm-selected-geometry-workspace-package/v1';
export const RVM_SELECTED_GEOMETRY_POST_MESSAGE_TYPE = 'rvm-selected-geometry-workspace-package';
export const PENDING_WORKSPACE_PACKAGE_STORAGE_KEY = 'rvmSelectedGeometryWorkspacePackage.pending';

const PIPE_TYPES = new Set(['PIPE', 'BEND', 'ELBOW', 'ELBO', 'TEE', 'FLAN', 'FLANGE', 'VALV', 'VALVE', 'REDU', 'REDUCER']);
const SUPPORT_TYPES = new Set(['ATTA', 'SUPPORT', 'REST', 'GUIDE', 'LINESTOP', 'LINE_STOP', 'LIMIT', 'LIM', 'ANCHOR', 'SPRING']);

export function normalizeRvmSelectedGeometryWorkspacePackage(packageJson, importSource, importedAt) {
  if (!packageJson || typeof packageJson !== 'object' || Array.isArray(packageJson)) {
    throw new TypeError('RVM workspace package must be a JSON object.');
  }

  let geometry;
  let source;
  let sourceSchema = packageJson.schema;

  if (packageJson.schema === RVM_SELECTED_GEOMETRY_WORKSPACE_PACKAGE_SCHEMA) {
    geometry = objectValue(packageJson.geometry, 'geometry');
    source = objectValue(packageJson.source, 'source');
  } else if (packageJson.schema === 'inputxml-managed-stage/v1' || Array.isArray(packageJson.selected)) {
    sourceSchema = packageJson.schema || 'json-viewer-selection/v1';
    source = packageJson.source ? { sourceFileName: packageJson.source } : {};
    
    // Adapt selected primitives format
    const items = Array.isArray(packageJson.selected) 
      ? packageJson.selected.map(s => s?.item).filter(Boolean)
      : Array.isArray(packageJson.objects) 
        ? packageJson.objects 
        : [];
        
    const objects = [];
    const supports = [];
    
    items.forEach(item => {
      const type = stringValue(item?.type || item?.attributes?.TYPE || item?.sourceAttributes?.TYPE || 'OBJECT');
      const adaptedItem = { ...item, type };
      
      if (item?.nativeParams?.startPoint) {
        adaptedItem.apos = item.nativeParams.startPoint;
      }
      if (item?.nativeParams?.endPoint) {
        adaptedItem.lpos = item.nativeParams.endPoint;
      }
      if (item?.nativeParams?.center) {
        adaptedItem.center = item.nativeParams.center;
      }

      if (isSupportLikeType(type)) {
        supports.push(adaptedItem);
      } else {
        objects.push(adaptedItem);
      }
    });
    
    geometry = {
      objects,
      supports,
      branches: []
    };
  } else {
    throw new Error(`Unsupported RVM workspace schema: ${String(packageJson.schema || 'missing')}.`);
  }

  const objects = arrayValue(geometry.objects, 'geometry.objects').map(clonePlain);
  const supports = arrayValue(geometry.supports, 'geometry.supports').map(clonePlain);
  const branches = arrayValue(geometry.branches, 'geometry.branches').map(clonePlain);
  const workspace = {
    schema: packageJson.schema,
    importSource: stringValue(importSource),
    importedAt: stringValue(importedAt),
    source: clonePlain(source),
    axisTransform: clonePlain(packageJson.axisTransform || {}),
    geometry: { objects, supports, branches },
    enrichment: clonePlain(packageJson.enrichment || {}),
    packageHash: stringValue(packageJson.packageHash),
  };
  return freezeDeep({
    ...workspace,
    summary: summarizeRvmSelectedGeometryWorkspace(workspace),
  });
}

export function summarizeRvmSelectedGeometryWorkspace(workspace) {
  const objects = Array.isArray(workspace?.geometry?.objects) ? workspace.geometry.objects : [];
  const supports = Array.isArray(workspace?.geometry?.supports) ? workspace.geometry.supports : [];
  const branches = Array.isArray(workspace?.geometry?.branches) ? workspace.geometry.branches : [];
  const stats = workspace?.enrichment?.stats || {};
  let pipeCount = 0;
  let supportCount = supports.length;
  for (const object of objects) {
    if (isPipeLikeType(object?.type)) pipeCount += 1;
    if (!supports.length && isSupportLikeType(object?.type)) supportCount += 1;
  }
  return freezeDeep({
    objects: objects.length,
    pipes: pipeCount,
    supports: supportCount,
    branches: branches.length,
    resolved: numberValue(stats.resolved),
    conflicts: numberValue(stats.conflicts),
    missing: numberValue(stats.missing),
    approximate: numberValue(stats.approximate),
    diagnostics: Array.isArray(workspace?.enrichment?.diagnostics) ? workspace.enrichment.diagnostics.map(clonePlain) : [],
  });
}

export function workspaceObjectStatus(object) {
  const audit = object?.attributes?.enrichment?.audit || {};
  const conflicts = Array.isArray(audit.conflicts) ? audit.conflicts.length : 0;
  const missing = Array.isArray(audit.missing) ? audit.missing.length : 0;
  const confidence = Number(audit.confidence);
  if (conflicts) return 'conflict';
  if (missing || audit.needsReview) return 'review';
  if (Number.isFinite(confidence) && confidence > 0) return 'resolved';
  return 'missing';
}

export function workspaceObjectRows(workspace, limit) {
  const objects = Array.isArray(workspace?.geometry?.objects) ? workspace.geometry.objects : [];
  return objects.slice(0, limit).map((object) => freezeDeep({
    id: stringValue(object?.id),
    name: stringValue(object?.name),
    type: stringValue(object?.type || 'OBJECT'),
    sourcePath: stringValue(object?.sourcePath),
    lineNo: stringValue(object?.attributes?.enrichment?.lineList?.lineNo || object?.sourceAttributes?.LINE_NO),
    pipingClass: stringValue(object?.attributes?.enrichment?.pipingClass?.className || object?.sourceAttributes?.PIPING_CLASS),
    status: workspaceObjectStatus(object),
  }));
}

function objectValue(value, fieldName) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`RVM workspace package field "${fieldName}" must be an object.`);
  }
  return value;
}

function arrayValue(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new TypeError(`RVM workspace package field "${fieldName}" must be an array.`);
  }
  return value;
}

function isPipeLikeType(type) {
  const normalized = normalizeKey(type);
  return PIPE_TYPES.has(normalized) || normalized.includes('PIPE') || normalized.includes('BEND') || normalized.includes('VALV');
}

function isSupportLikeType(type) {
  const normalized = normalizeKey(type);
  return SUPPORT_TYPES.has(normalized) || normalized.includes('SUPPORT') || normalized.includes('ATTA') || normalized.includes('GUIDE');
}

function normalizeKey(value) {
  return stringValue(value).toUpperCase().replace(/[^A-Z0-9.]+/g, '');
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function stringValue(value) {
  return String(value ?? '').trim();
}

function clonePlain(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const key of Object.keys(value)) freezeDeep(value[key]);
  return Object.freeze(value);
}
