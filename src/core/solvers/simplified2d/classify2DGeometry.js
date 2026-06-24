const getPos = (nodes, id) => nodes?.[id]?.pos || [0, 0, 0];
const segEndpoints = (nodes, segment) => [getPos(nodes, segment.start || segment.startNode), getPos(nodes, segment.end || segment.endNode)];
const vector = (nodes, segment) => {
  const [a, b] = segEndpoints(nodes, segment);
  return { x: b[0] - a[0], y: b[1] - a[1], length: Math.hypot(b[0] - a[0], b[1] - a[1]) || Number(segment.trueLength) || 0 };
};
const axisOf = (v) => Math.abs(v.x) >= Math.abs(v.y) ? 'X' : 'Y';
const signOf = (value) => value >= 0 ? '+' : '-';

export function classifySimplified2DGeometry(input = {}) {
  const nodes = input.nodes || {};
  const segments = input.segments || [];
  const warnings = [];
  if (!segments.length) return { geometryType: 'EMPTY', confidence: 0, warnings: ['No 2D segments available for simplified screening.'], directions: [] };
  if (segments.length === 1) return { geometryType: 'SINGLE_LEG', confidence: 0.4, warnings: ['Single leg cannot absorb thermal expansion by itself.'], directions: [] };

  const directions = segments.map((segment) => {
    const v = vector(nodes, segment);
    return { segmentId: segment.id, axis: axisOf(v), sign: axisOf(v) === 'X' ? signOf(v.x) : signOf(v.y), length: v.length };
  }).filter((direction) => direction.length > 1e-9);
  const axes = new Set(directions.map((direction) => direction.axis));
  const xCount = directions.filter((direction) => direction.axis === 'X').length;
  const yCount = directions.filter((direction) => direction.axis === 'Y').length;

  let geometryType = 'MULTI_LEG';
  let confidence = 0.65;
  if (directions.length === 2 && axes.size === 2) {
    geometryType = 'L_SHAPE';
    confidence = 0.9;
  } else if (directions.length === 3 && axes.size === 2) {
    const first = directions[0];
    const third = directions[2];
    geometryType = first.axis === third.axis ? 'Z_SHAPE' : 'OFFSET';
    confidence = 0.82;
  } else if (directions.length >= 4 && xCount >= 2 && yCount >= 2) {
    geometryType = 'LOOP_OR_MULTI_LEG';
    confidence = 0.72;
  } else if (axes.size === 1) {
    geometryType = 'STRAIGHT_RUN';
    confidence = 0.5;
    warnings.push('All legs are collinear; simplified absorbing leg is not evident.');
  }

  return { geometryType, confidence, warnings, directions, xCount, yCount, segmentCount: directions.length };
}
