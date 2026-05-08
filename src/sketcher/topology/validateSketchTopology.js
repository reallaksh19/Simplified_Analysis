export const SKETCH_TOPOLOGY_SCHEMA_VERSION = 'sketch-topology-validation-v1';

function issue(severity, code, message, data = {}) {
  return { severity, code, message, data };
}

export function buildConnectionIndex(segments = []) {
  return segments.reduce((acc, segment) => {
    if (segment.startNode) {
      acc[segment.startNode] = acc[segment.startNode] || [];
      acc[segment.startNode].push(segment);
    }
    if (segment.endNode) {
      acc[segment.endNode] = acc[segment.endNode] || [];
      acc[segment.endNode].push(segment);
    }
    return acc;
  }, {});
}

export function validateSketchTopology(nodes = {}, segments = [], options = {}) {
  const issues = [];
  const tolerance = Number(options.zeroLengthTolerance_mm ?? 1e-6);
  const connectionIndex = buildConnectionIndex(segments);

  for (const segment of segments) {
    if (!segment.id) {
      issues.push(issue('error', 'SEGMENT_ID_MISSING', 'A segment is missing id.', { segment }));
    }
    if (!segment.startNode || !nodes[segment.startNode]) {
      issues.push(issue('error', 'MISSING_START_NODE', `Segment ${segment.id || '?'} has missing start node.`, { segmentId: segment.id, startNode: segment.startNode }));
    }
    if (!segment.endNode || !nodes[segment.endNode]) {
      issues.push(issue('error', 'MISSING_END_NODE', `Segment ${segment.id || '?'} has missing end node.`, { segmentId: segment.id, endNode: segment.endNode }));
    }
    if (segment.startNode && segment.startNode === segment.endNode) {
      issues.push(issue('error', 'SELF_LOOP_SEGMENT', `Segment ${segment.id || '?'} connects a node to itself.`, { segmentId: segment.id }));
    }
    const a = nodes?.[segment.startNode]?.pos;
    const b = nodes?.[segment.endNode]?.pos;
    if (a && b) {
      const length = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      if (length <= tolerance) {
        issues.push(issue('error', 'ZERO_LENGTH_SEGMENT', `Segment ${segment.id || '?'} length is below tolerance.`, { segmentId: segment.id, length_mm: length, tolerance }));
      }
    }
  }

  for (const [nodeId, node] of Object.entries(nodes)) {
    const connected = connectionIndex[nodeId] || [];
    const count = connected.length;
    if (count === 0) {
      issues.push(issue('warn', 'DISCONNECTED_NODE', `Node ${nodeId} is disconnected.`, { nodeId }));
    }
    if (node.type === 'elbow' && count !== 2) {
      issues.push(issue('error', 'INVALID_ELBOW_CONNECTION_COUNT', `Elbow ${nodeId} requires exactly 2 connected segments.`, { nodeId, count }));
    }
    if (node.type === 'tee' && count !== 3) {
      issues.push(issue('error', 'INVALID_TEE_CONNECTION_COUNT', `Tee ${nodeId} requires exactly 3 connected segments.`, { nodeId, count }));
    }
    if (node.type === 'olet' && count < 2) {
      issues.push(issue('error', 'INVALID_OLET_CONNECTION_COUNT', `Olet ${nodeId} requires at least 2 connected segments.`, { nodeId, count }));
    }
  }

  const unsupportedForGC3D = Object.values(nodes).some((node) =>
    ['tee', 'olet', 'branch'].includes(String(node.type || '').toLowerCase())
  );

  return {
    schemaVersion: SKETCH_TOPOLOGY_SCHEMA_VERSION,
    ok: !issues.some((item) => item.severity === 'error'),
    unsupportedForGC3D,
    issues,
    summary: {
      nodeCount: Object.keys(nodes).length,
      segmentCount: segments.length,
      errorCount: issues.filter((item) => item.severity === 'error').length,
      warningCount: issues.filter((item) => item.severity === 'warn').length,
    },
  };
}
