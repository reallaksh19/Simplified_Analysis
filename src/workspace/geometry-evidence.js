import { freezeDeep, isRecord, stringValue } from './dataset-utils.js';

export function extractGeometryEvidence(item) {
  const attributes = isRecord(item?.attributes) ? item.attributes : {};
  const sourceAttributes = isRecord(item?.sourceAttributes) ? item.sourceAttributes : {};
  const nativeParams = isRecord(item?.nativeParams) ? item.nativeParams : {};

  const start = firstPoint(
    item?.apos,
    nativeParams.startPoint,
    attributes.APOS,
    sourceAttributes.APOS,
    pointFromFields(attributes, 'APOS'),
    pointFromFields(sourceAttributes, 'APOS'),
  );
  let end = firstPoint(
    item?.lpos,
    nativeParams.endPoint,
    attributes.LPOS,
    sourceAttributes.LPOS,
    pointFromFields(attributes, 'LPOS'),
    pointFromFields(sourceAttributes, 'LPOS'),
  );
  const delta = firstPoint(
    item?.delta,
    nativeParams.delta,
    pointFromFields(attributes, 'DELTA'),
    pointFromFields(sourceAttributes, 'DELTA'),
    pointFromDeltaFields(attributes),
    pointFromDeltaFields(sourceAttributes),
  );

  if (start && !end && delta) end = addPoints(start, delta);

  const center = firstPoint(
    item?.center,
    nativeParams.center,
    attributes.CENTER,
    sourceAttributes.CENTER,
    pointFromFields(attributes, 'CENTER'),
    pointFromFields(sourceAttributes, 'CENTER'),
  ) || midpoint(start, end);

  return freezeDeep({ start, end, center });
}

function firstPoint(...candidates) {
  for (const candidate of candidates) {
    const point = readPoint(candidate);
    if (point) return point;
  }
  return null;
}

function readPoint(value) {
  if (!value) return null;
  if (Array.isArray(value)) return pointFromNumbers(value[0], value[1], value[2]);
  if (isRecord(value)) {
    return pointFromNumbers(value.x ?? value.X, value.y ?? value.Y, value.z ?? value.Z);
  }
  const parts = stringValue(value).match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [];
  if (parts.length < 3) return null;
  return pointFromNumbers(parts[0], parts[1], parts[2]);
}

function pointFromFields(record, prefix) {
  if (!isRecord(record)) return null;
  return pointFromNumbers(
    record[`${prefix}_X`] ?? record[`${prefix}X`] ?? record[`${prefix}.X`],
    record[`${prefix}_Y`] ?? record[`${prefix}Y`] ?? record[`${prefix}.Y`],
    record[`${prefix}_Z`] ?? record[`${prefix}Z`] ?? record[`${prefix}.Z`],
  );
}

function pointFromDeltaFields(record) {
  if (!isRecord(record)) return null;
  return pointFromNumbers(record.DX, record.DY, record.DZ);
}

function pointFromNumbers(xValue, yValue, zValue) {
  const x = numberMaybe(xValue);
  const y = numberMaybe(yValue);
  const z = numberMaybe(zValue);
  if (x === null || y === null || z === null) return null;
  return freezeDeep({ x, y, z });
}

function numberMaybe(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value === null || value === undefined || value === '') return null;
  const match = stringValue(value).replace(/,/g, '').match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/i);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function addPoints(a, b) {
  if (!a || !b) return null;
  return freezeDeep({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
}

function midpoint(a, b) {
  if (!a || !b) return null;
  return freezeDeep({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  });
}
