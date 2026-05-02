import { transformCanonical3dTo2d } from '../transform3dTo2d.js';
import { transformPayloadToCanonicalGeometry } from './transformToCanonicalGeometry.js';
import { classifySimplified2DGeometry } from '../../solvers/simplified2d/classify2DGeometry.js';

export function canonicalToSimplified2D(geometry, options = {}) {
  const transform = transformCanonical3dTo2d(geometry, { plane: options.plane || 'AUTO', mode: options.mode || 'smart', source: options.source || geometry?.source || 'canonical' });
  const canonical2D = transformPayloadToCanonicalGeometry(transform, { source: options.source || 'simplified-2d', unit: geometry?.unit || 'mm' });
  const nodes = {};
  (canonical2D.nodes || []).forEach((node) => {
    nodes[node.id] = { pos: [node.x, node.y, node.z], type: node.restraint === 'ANCHOR' ? 'anchor' : 'free', meta: node.meta || {} };
  });
  const segments = (canonical2D.segments || []).map((segment) => ({ id: segment.id, start: segment.startNodeId, end: segment.endNodeId, startNode: segment.startNodeId, endNode: segment.endNodeId, trueLength: segment.length, properties: { type: segment.type || 'PIPE', bore: segment.diameter, material: segment.material, sourceComponentUid: segment.sourceComponentUid } }));
  const classification = classifySimplified2DGeometry({ nodes, segments });
  return { schemaVersion: 'simplified-2d-v1', source: options.source || geometry?.source || 'canonical', plane: transform.plane, nodes, segments, canonicalGeometry: canonical2D, transform, classification, diagnostics: [...(geometry?.diagnostics || []), ...(transform.diagnostics || []), ...(canonical2D.diagnostics || [])], warnings: [...(classification.warnings || []), ...(canonical2D.diagnostics || []).filter((diagnostic) => diagnostic.severity === 'warn').map((diagnostic) => diagnostic.message)], summary: { nodeCount: Object.keys(nodes).length, segmentCount: segments.length, geometryType: classification.geometryType, plane: transform.plane } };
}
