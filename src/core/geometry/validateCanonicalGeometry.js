const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const addDiagnostic = (diagnostics, severity, code, message, data = {}) => {
  diagnostics.push({ severity, code, message, data });
};

const nodeKey = (node, tolerance) => [
  Math.round(node.x / tolerance),
  Math.round(node.y / tolerance),
  Math.round(node.z / tolerance),
].join('|');

/**
 * Validate canonical geometry before solver handoff.
 * @param {import('./geometryTypes.js').CanonicalGeometry} geometry
 * @param {{ tolerance?: number, requireKnownUnit?: boolean }} options
 * @returns {{ ok: boolean, errors: Array<Record<string, unknown>>, warnings: Array<Record<string, unknown>>, diagnostics: Array<Record<string, unknown>>, summary: Record<string, unknown> }}
 */
export function validateCanonicalGeometry(geometry, options = {}) {
  const tolerance = options.tolerance ?? 1e-6;
  const requireKnownUnit = options.requireKnownUnit ?? false;
  const diagnostics = [];
  const errors = [];
  const warnings = [];

  if (!geometry || typeof geometry !== 'object') {
    addDiagnostic(errors, 'error', 'GEOM_NULL', 'Geometry payload is missing or not an object.');
    return { ok: false, errors, warnings, diagnostics: errors, summary: { nodeCount: 0, segmentCount: 0 } };
  }

  const nodes = Array.isArray(geometry.nodes) ? geometry.nodes : [];
  const segments = Array.isArray(geometry.segments) ? geometry.segments : [];
  const nodeIds = new Set();
  const duplicateCoordinateMap = new Map();

  if (requireKnownUnit && (!geometry.unit || geometry.unit === 'unknown')) {
    addDiagnostic(errors, 'error', 'GEOM_UNIT_UNKNOWN', 'Geometry unit is unknown; solver execution should be blocked.');
  } else if (!geometry.unit || geometry.unit === 'unknown') {
    addDiagnostic(warnings, 'warn', 'GEOM_UNIT_UNKNOWN', 'Geometry unit is unknown; assuming caller will handle unit conversion.');
  }

  nodes.forEach((node, index) => {
    if (!node || typeof node !== 'object') {
      addDiagnostic(errors, 'error', 'NODE_INVALID', `Node at index ${index} is invalid.`, { index });
      return;
    }

    if (!node.id) {
      addDiagnostic(errors, 'error', 'NODE_ID_MISSING', `Node at index ${index} has no id.`, { index });
    } else if (nodeIds.has(node.id)) {
      addDiagnostic(errors, 'error', 'NODE_ID_DUPLICATE', `Duplicate node id ${node.id}.`, { id: node.id });
    } else {
      nodeIds.add(node.id);
    }

    if (!isFiniteNumber(node.x) || !isFiniteNumber(node.y) || !isFiniteNumber(node.z)) {
      addDiagnostic(errors, 'error', 'NODE_COORD_INVALID', `Node ${node.id || index} has non-numeric coordinates.`, { node });
      return;
    }

    const key = nodeKey(node, tolerance || 1e-6);
    const existing = duplicateCoordinateMap.get(key);
    if (existing && existing.id !== node.id) {
      addDiagnostic(warnings, 'warn', 'NODE_COORD_DUPLICATE', 'Two nodes share the same coordinate bucket.', { first: existing.id, second: node.id, tolerance });
    } else {
      duplicateCoordinateMap.set(key, node);
    }
  });

  const segmentKeys = new Set();
  segments.forEach((segment, index) => {
    if (!segment || typeof segment !== 'object') {
      addDiagnostic(errors, 'error', 'SEGMENT_INVALID', `Segment at index ${index} is invalid.`, { index });
      return;
    }

    if (!segment.id) {
      addDiagnostic(errors, 'error', 'SEGMENT_ID_MISSING', `Segment at index ${index} has no id.`, { index });
    }

    if (!nodeIds.has(segment.startNodeId)) {
      addDiagnostic(errors, 'error', 'SEGMENT_START_MISSING', `Segment ${segment.id || index} references missing start node.`, { segment });
    }
    if (!nodeIds.has(segment.endNodeId)) {
      addDiagnostic(errors, 'error', 'SEGMENT_END_MISSING', `Segment ${segment.id || index} references missing end node.`, { segment });
    }
    if (segment.startNodeId && segment.startNodeId === segment.endNodeId && segment.type !== 'SUPPORT') {
      addDiagnostic(errors, 'error', 'SEGMENT_ZERO_TOPOLOGY', `Segment ${segment.id || index} starts and ends on the same node.`, { segment });
    }

    const undirectedKey = [segment.startNodeId, segment.endNodeId].sort().join('|');
    if (segmentKeys.has(undirectedKey)) {
      addDiagnostic(warnings, 'warn', 'SEGMENT_DUPLICATE_PATH', 'Duplicate segment path detected.', { segment });
    } else {
      segmentKeys.add(undirectedKey);
    }

    if (typeof segment.length === 'number' && segment.length <= tolerance && segment.type !== 'SUPPORT') {
      addDiagnostic(errors, 'error', 'SEGMENT_ZERO_LENGTH', `Segment ${segment.id || index} has zero or near-zero length.`, { length: segment.length, tolerance });
    }
  });

  // 7. Components reference existing segment or node anchors.
  if (geometry.components) {
    const componentIds = new Set();
    geometry.components.forEach((comp, idx) => {
      if (!comp.id) {
         addDiagnostic(errors, 'error', 'COMPONENT_ID_MISSING', `Component at index ${idx} is missing an ID.`);
      } else if (componentIds.has(comp.id)) {
         addDiagnostic(errors, 'error', 'COMPONENT_ID_DUPLICATE', `Duplicate component ID: ${comp.id}`);
      } else {
         componentIds.add(comp.id);
      }

      if (comp.segmentId && !segmentKeys.has(comp.segmentId)) {
        addDiagnostic(errors, 'error', 'COMPONENT_SEGMENT_MISSING', `Component ${comp.id} references missing segment ${comp.segmentId}.`);
      }
      if (comp.nodeId && !nodeIds.has(comp.nodeId)) {
        addDiagnostic(errors, 'error', 'COMPONENT_NODE_MISSING', `Component ${comp.id} references missing node ${comp.nodeId}.`);
      }
    });
  }

  // 8. Supports reference existing nodes or segments.
  if (geometry.supports) {
     const supportIds = new Set();
     geometry.supports.forEach((supp, idx) => {
       if (!supp.id) {
          addDiagnostic(errors, 'error', 'SUPPORT_ID_MISSING', `Support at index ${idx} is missing an ID.`);
       } else if (supportIds.has(supp.id)) {
          addDiagnostic(errors, 'error', 'SUPPORT_ID_DUPLICATE', `Duplicate support ID: ${supp.id}`);
       } else {
          supportIds.add(supp.id);
       }

       if (supp.nodeId && !nodeIds.has(supp.nodeId)) {
          addDiagnostic(errors, 'error', 'SUPPORT_NODE_MISSING', `Support ${supp.id} references missing node ${supp.nodeId}.`);
       }
       if (supp.segmentId && !segmentKeys.has(supp.segmentId)) {
          addDiagnostic(errors, 'error', 'SUPPORT_SEGMENT_MISSING', `Support ${supp.id} references missing segment ${supp.segmentId}.`);
       }
     });
  }

  // 9. Required calculation fields
  segments.forEach(seg => {
     // If it's a pipe, bend, elbow, tee etc
     if (['PIPE', 'BEND', 'ELBOW', 'TEE', 'VALVE', 'FLANGE'].includes(seg.type)) {
       if (typeof seg.diameter !== 'number' || isNaN(seg.diameter)) {
          addDiagnostic(warnings, 'warn', 'SEGMENT_DIAMETER_MISSING', `Segment ${seg.id} is missing diameter or bore.`);
       }
       if (typeof seg.thickness !== 'number' || isNaN(seg.thickness)) {
          addDiagnostic(warnings, 'warn', 'SEGMENT_THICKNESS_MISSING', `Segment ${seg.id} is missing wall thickness.`);
       }
       if (!seg.material || typeof seg.material !== 'string') {
          addDiagnostic(warnings, 'warn', 'SEGMENT_MATERIAL_MISSING', `Segment ${seg.id} is missing material property.`);
       }
     }
  });

  diagnostics.push(...errors, ...warnings);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    diagnostics,
    summary: {
      nodeCount: nodes.length,
      segmentCount: segments.length,
      errorCount: errors.length,
      warningCount: warnings.length,
      unit: geometry.unit || 'unknown',
      source: geometry.source || 'unknown',
    },
  };
}
