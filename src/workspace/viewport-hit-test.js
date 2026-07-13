const DEFAULT_PADDING = 28;
export const VIEWPORT_HIT_TOLERANCE_PX = 10;

export function buildCanvasProjection(model, width, height, padding = DEFAULT_PADDING) {
  const safeWidth = Math.max(Number(width) || 0, 1);
  const safeHeight = Math.max(Number(height) || 0, 1);
  const projected = model.items
    .flatMap((item) => [item.start, item.end, item.center])
    .filter(Boolean)
    .map(projectViewportPoint);

  if (!projected.length) return () => ({ x: padding, y: safeHeight - padding });

  const xs = projected.map((point) => point.x);
  const ys = projected.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const availableWidth = Math.max(safeWidth - padding * 2, 1);
  const availableHeight = Math.max(safeHeight - padding * 2, 1);
  const scale = Math.max(Math.min(availableWidth / spanX, availableHeight / spanY), 0.000001);

  return (point) => {
    const projectedPoint = projectViewportPoint(point);
    return {
      x: padding + (projectedPoint.x - minX) * scale,
      y: safeHeight - padding - (projectedPoint.y - minY) * scale,
    };
  };
}

export function pickViewportItem(
  model,
  width,
  height,
  screenPoint,
  tolerance = VIEWPORT_HIT_TOLERANCE_PX,
) {
  if (!model?.items?.length || !isScreenPoint(screenPoint)) return '';
  const projection = buildCanvasProjection(model, width, height);
  let bestEntityId = '';
  let bestDistance = Number.POSITIVE_INFINITY;

  model.items.forEach((item) => {
    const distance = item.kind === 'segment'
      ? distanceToSegment(screenPoint, projection(item.start), projection(item.end))
      : distanceBetween(screenPoint, projection(item.center));

    if (distance <= tolerance && distance < bestDistance) {
      bestDistance = distance;
      bestEntityId = item.entityId;
    }
  });

  return bestEntityId;
}

export function projectViewportPoint(point) {
  return {
    x: (point.x - point.z) * 0.70710678,
    y: point.y * 0.85 - (point.x + point.z) * 0.35355339,
  };
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= Number.EPSILON) return distanceBetween(point, start);

  const projection = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
  const clamped = Math.max(0, Math.min(1, projection));
  return distanceBetween(point, {
    x: start.x + clamped * dx,
    y: start.y + clamped * dy,
  });
}

function distanceBetween(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isScreenPoint(value) {
  return value
    && Number.isFinite(value.x)
    && Number.isFinite(value.y);
}
