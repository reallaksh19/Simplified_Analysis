const formatNumber = (value) => Number(value || 0).toFixed(4);

const pointLine = (keyword, point, fallbackBore = 0) => (
  `    ${keyword}    ${formatNumber(point.x)} ${formatNumber(point.y)} ${formatNumber(point.z)} ${formatNumber(point.bore || fallbackBore)}`
);

const directionFromPoints = (points = []) => {
  if (points.length < 2) return 'UNKNOWN';
  const [a, b] = points;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  if (Math.abs(dx) >= Math.abs(dy) && Math.abs(dx) >= Math.abs(dz)) return dx >= 0 ? 'EAST' : 'WEST';
  if (Math.abs(dy) >= Math.abs(dx) && Math.abs(dy) >= Math.abs(dz)) return dy >= 0 ? 'NORTH' : 'SOUTH';
  return dz >= 0 ? 'UP' : 'DOWN';
};

const lengthFromPoints = (points = []) => {
  if (points.length < 2) return null;
  const [a, b] = points;
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
};

const shouldSkipAttribute = (key) => (
  key.startsWith('END-POINT-') ||
  key === 'REFNO' ||
  key === 'PIPELINE-REFERENCE' ||
  key.startsWith('<SUPPORT')
);

/**
 * Serialize parsed PCF components back to a conservative PCF-like text export.
 * Raw component attributes are preserved where possible; geometry lines are
 * regenerated from the current edited component coordinates.
 * @param {Array<Record<string, unknown>>} components
 * @returns {string}
 */
export function serializePcf(components) {
  const lines = [];

  (components || []).forEach((item) => {
    const type = item.type || 'PIPE';
    const mat = item.attributes?.['COMPONENT-ATTRIBUTE3'] || item.attributes?.MATERIAL || item.attributes?.['ITEM-CODE'] || 'UNKNOWN-MATERIAL';
    const ref = item.attributes?.REFNO || item.attributes?.['COMPONENT-ATTRIBUTE97'] || item.id || 'UNKNOWN';
    const length = lengthFromPoints(item.points);
    const lenStr = length === null ? '' : `, LENGTH=${length.toFixed(0)}MM`;
    const dirStr = directionFromPoints(item.points);

    lines.push('MESSAGE-SQUARE');
    lines.push(`    ${type}, ${mat}${lenStr}, ${dirStr}, RefNo:=${ref}`);
    lines.push(type);

    (item.points || []).forEach((point) => {
      lines.push(pointLine('END-POINT', point, item.bore));
    });

    if (item.centrePoint) lines.push(pointLine('CENTRE-POINT', item.centrePoint, item.bore));
    if (item.branch1Point) lines.push(pointLine('BRANCH1-POINT', item.branch1Point, item.bore));
    if (item.branch2Point) lines.push(pointLine('BRANCH2-POINT', item.branch2Point, item.bore));
    if (item.branch3Point) lines.push(pointLine('BRANCH3-POINT', item.branch3Point, item.bore));
    if (item.coOrds || item.coords) lines.push(pointLine('CO-ORDS', item.coOrds || item.coords, item.bore));

    const pipelineRef = (item.attributes?.['PIPELINE-REFERENCE'] || '').trim();
    if (pipelineRef) lines.push(`    PIPELINE-REFERENCE ${pipelineRef}`);

    const sortedEntries = Object.entries(item.attributes || {}).sort(([a], [b]) => {
      const ma = a.match(/COMPONENT-ATTRIBUTE(\d+)/);
      const mb = b.match(/COMPONENT-ATTRIBUTE(\d+)/);
      if (ma && mb) return parseInt(ma[1], 10) - parseInt(mb[1], 10);
      if (ma) return 1;
      if (mb) return -1;
      return a.localeCompare(b);
    });

    sortedEntries.forEach(([key, value]) => {
      if (shouldSkipAttribute(key)) return;
      if (value === null || typeof value === 'undefined' || String(value).trim() === '') return;
      lines.push(`    ${key}    ${value}`);
    });

    lines.push('');
  });

  return lines.join('\n');
}
