import { WORKSPACE_DATASET_SCHEMA } from './dataset-adapter.js';
import { freezeDeep } from './dataset-utils.js';

export const VIEWPORT_RENDER_MODEL_SCHEMA = 'viewport-render-model/v1';

export function buildViewportRenderModel(dataset) {
  assertDataset(dataset);
  const items = [];
  const skippedEntityIds = [];

  dataset.entities.forEach((entity) => {
    const geometry = entity?.properties?.geometry || {};
    if (geometry.start && geometry.end) {
      items.push(renderItem(entity, 'segment', geometry));
      return;
    }
    if (geometry.center) {
      items.push(renderItem(entity, 'point', geometry));
      return;
    }
    skippedEntityIds.push(entity.entityId);
  });

  const bounds = calculateBounds(items);
  const segmentCount = items.filter((item) => item.kind === 'segment').length;
  const pointCount = items.length - segmentCount;

  return freezeDeep({
    schema: VIEWPORT_RENDER_MODEL_SCHEMA,
    datasetId: dataset.datasetId,
    items,
    skippedEntityIds,
    bounds,
    summary: {
      renderableCount: items.length,
      skippedCount: skippedEntityIds.length,
      segmentCount,
      pointCount,
    },
  });
}

export function assertViewportRenderModel(model) {
  if (!model || model.schema !== VIEWPORT_RENDER_MODEL_SCHEMA || !Array.isArray(model.items)) {
    throw new TypeError(`Viewport renderer requires ${VIEWPORT_RENDER_MODEL_SCHEMA}.`);
  }
}

function assertDataset(dataset) {
  if (!dataset || dataset.schema !== WORKSPACE_DATASET_SCHEMA || !Array.isArray(dataset.entities)) {
    throw new TypeError(`Render-model adapter requires ${WORKSPACE_DATASET_SCHEMA}.`);
  }
}

function renderItem(entity, kind, geometry) {
  return freezeDeep({
    entityId: entity.entityId,
    entityType: entity.entityType,
    category: entity.category,
    kind,
    start: kind === 'segment' ? geometry.start : null,
    end: kind === 'segment' ? geometry.end : null,
    center: geometry.center || midpoint(geometry.start, geometry.end),
  });
}

function calculateBounds(items) {
  const points = items.flatMap((item) => [item.start, item.end, item.center]).filter(Boolean);
  if (points.length === 0) return defaultBounds();

  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  points.forEach((point) => {
    min.x = Math.min(min.x, point.x);
    min.y = Math.min(min.y, point.y);
    min.z = Math.min(min.z, point.z);
    max.x = Math.max(max.x, point.x);
    max.y = Math.max(max.y, point.y);
    max.z = Math.max(max.z, point.z);
  });

  const size = {
    x: Math.max(max.x - min.x, 1),
    y: Math.max(max.y - min.y, 1),
    z: Math.max(max.z - min.z, 1),
  };
  const center = {
    x: (min.x + max.x) / 2,
    y: (min.y + max.y) / 2,
    z: (min.z + max.z) / 2,
  };
  const radius = Math.max(Math.hypot(size.x, size.y, size.z) / 2, 1);
  return freezeDeep({ min, max, size, center, radius });
}

function defaultBounds() {
  return freezeDeep({
    min: { x: -0.5, y: -0.5, z: -0.5 },
    max: { x: 0.5, y: 0.5, z: 0.5 },
    size: { x: 1, y: 1, z: 1 },
    center: { x: 0, y: 0, z: 0 },
    radius: 1,
  });
}

function midpoint(a, b) {
  if (!a || !b) return null;
  return freezeDeep({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  });
}
