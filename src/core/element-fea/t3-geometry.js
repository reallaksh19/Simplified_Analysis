import { deepFreeze } from '../shared-piping-model/index.js';

export function signedArea(nodes) {
  const [a, b, c] = nodes;
  return 0.5 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
}

export function createT3Geometry(nodes) {
  const area = signedArea(nodes);
  const [a, b, c] = nodes;
  const bRows = [b.y - c.y, c.y - a.y, a.y - b.y];
  const cRows = [c.x - b.x, a.x - c.x, b.x - a.x];
  const scale = 1 / (2 * area);
  const derivatives = bRows.map((bx, index) => ({ dNdx: bx * scale, dNdy: cRows[index] * scale }));
  return deepFreeze({ area, derivatives, B: strainDisplacementMatrix(derivatives) });
}

export function strainDisplacementMatrix(derivatives) {
  const matrix = [Array(6).fill(0), Array(6).fill(0), Array(6).fill(0)];
  derivatives.forEach((row, index) => {
    const column = index * 2;
    matrix[0][column] = row.dNdx;
    matrix[1][column + 1] = row.dNdy;
    matrix[2][column] = row.dNdy;
    matrix[2][column + 1] = row.dNdx;
  });
  return matrix;
}

export function outwardEdgeNormal(elementNodeIds, edgeNodeIds, nodeMap) {
  const ordered = orientedEdge(elementNodeIds, edgeNodeIds);
  const start = nodeMap.get(ordered[0]);
  const end = nodeMap.get(ordered[1]);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  return deepFreeze({ orderedNodeIds: ordered, length, normal: [dy / length, -dx / length] });
}

function orientedEdge(nodes, edge) {
  const pairs = [[nodes[0],nodes[1]],[nodes[1],nodes[2]],[nodes[2],nodes[0]]];
  const pair = pairs.find((row) => row.includes(edge[0]) && row.includes(edge[1]));
  if (!pair) throw new TypeError('Edge does not belong to T3 element.');
  return pair;
}
