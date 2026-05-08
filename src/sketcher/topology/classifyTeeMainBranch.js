function normalize(vector) {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  if (length <= 1e-12) return [0, 0, 0];
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function otherNodeId(segment, nodeId) {
  return segment.startNode === nodeId ? segment.endNode : segment.startNode;
}

function vectorFromNode(nodes, nodeId, segment) {
  const origin = nodes[nodeId]?.pos;
  const otherId = otherNodeId(segment, nodeId);
  const other = nodes[otherId]?.pos;
  if (!origin || !other) return [0, 0, 0];
  return normalize([other[0] - origin[0], other[1] - origin[1], other[2] - origin[2]]);
}

export function classifyTeeMainBranch(nodes = {}, nodeId, connectedSegments = []) {
  if (!nodes[nodeId]) {
    return { ok: false, main: [], branch: null, diagnostic: `Tee node ${nodeId} is missing.` };
  }
  if (!Array.isArray(connectedSegments) || connectedSegments.length !== 3) {
    return { ok: false, main: [], branch: null, diagnostic: `Tee node ${nodeId} requires exactly 3 connected segments for main/branch classification.` };
  }

  const vectors = connectedSegments.map((segment, index) => ({
    index,
    segment,
    vector: vectorFromNode(nodes, nodeId, segment),
  }));

  const rankedPairs = [[0, 1], [0, 2], [1, 2]].map(([a, b]) => ({
    a, b, score: Math.abs(dot(vectors[a].vector, vectors[b].vector)),
  })).sort((left, right) => right.score - left.score);

  const best = rankedPairs[0];
  const branchIndex = [0, 1, 2].find((index) => index !== best.a && index !== best.b);

  return {
    ok: true,
    main: [vectors[best.a].segment, vectors[best.b].segment],
    branch: vectors[branchIndex].segment,
    colinearityScore: best.score,
    diagnostic: null,
  };
}
