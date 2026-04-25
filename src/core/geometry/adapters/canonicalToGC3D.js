import { validateGeometry } from '../validateGeometry.js';
import { getSIFData } from '../../solvers/gc3d/GC3DSIFEngine.js';

const UNIT_TO_INCH = Object.freeze({
  mm: 1 / 25.4,
  millimeter: 1 / 25.4,
  m: 39.3700787402,
  meter: 39.3700787402,
  in: 1,
  inch: 1,
  ft: 12,
  feet: 12,
});

const axisFromDelta = (dx, dy, dz) => {
  const abs = { X: Math.abs(dx), Y: Math.abs(dy), Z: Math.abs(dz) };
  if (abs.Y >= abs.X && abs.Y >= abs.Z) return 'Y';
  if (abs.Z >= abs.X && abs.Z >= abs.Y) return 'Z';
  return 'X';
};

const nodeTypeFromRestraint = (restraint) => {
  const value = String(restraint || '').toUpperCase();
  if (value === 'ANCHOR') return 'anchor';
  if (value === 'GUIDE') return 'guide';
  return 'free';
};

const defaultWallFromDiameter = (odIn) => {
  if (odIn >= 10) return 0.365;
  if (odIn >= 8) return 0.322;
  if (odIn >= 6) return 0.280;
  if (odIn >= 4) return 0.237;
  return 0.154;
};

/**
 * Convert CanonicalGeometry into the GC3D solver's deterministic node/segment payload.
 * @param {import('../geometryTypes.js').CanonicalGeometry} geometry
 * @param {{ params?: Record<string, number>, includeSIF?: boolean, defaultOdIn?: number, defaultWtIn?: number }} options
 */
export function canonicalToGC3D(geometry, options = {}) {
  const validation = validateGeometry(geometry, { requireKnownUnit: true });
  const unit = geometry?.unit || 'unknown';
  const factor = UNIT_TO_INCH[String(unit).toLowerCase()] || 1;
  const diagnostics = [...(geometry?.diagnostics || []), ...validation.diagnostics];
  const warnings = [];

  if (!validation.ok) {
    warnings.push('Canonical geometry failed validation before GC3D conversion.');
  }
  if (!UNIT_TO_INCH[String(unit).toLowerCase()]) {
    warnings.push(`Unknown geometry unit "${unit}"; assuming coordinates are already inches.`);
  }

  const nodes = {};
  const nodeLookup = new Map();

  (geometry?.nodes || []).forEach((node) => {
    nodeLookup.set(node.id, node);
    nodes[node.id] = {
      pos: [node.x, node.y, node.z],
      type: nodeTypeFromRestraint(node.restraint),
      label: node.id,
      sourceComponentUid: node.sourceComponentUid,
      meta: node.meta || {},
    };
  });

  const fittingData = {};
  const segments = (geometry?.segments || []).map((segment) => {
    const start = nodeLookup.get(segment.startNodeId);
    const end = nodeLookup.get(segment.endNodeId);
    const dx = ((end?.x || 0) - (start?.x || 0)) * factor;
    const dy = ((end?.y || 0) - (start?.y || 0)) * factor;
    const dz = ((end?.z || 0) - (start?.z || 0)) * factor;
    const length_in = Math.hypot(dx, dy, dz);
    const od_in = Number(segment.diameter || 0) > 0 ? Number(segment.diameter) * factor : (options.defaultOdIn || 10.75);
    const wt_in = Number(segment.thickness || 0) > 0 ? Number(segment.thickness) * factor : (options.defaultWtIn || defaultWallFromDiameter(od_in));
    const compType = String(segment.type || 'PIPE').toUpperCase();
    const solverSegment = {
      id: segment.id,
      startNode: segment.startNodeId,
      endNode: segment.endNodeId,
      length_in,
      od_in,
      wt_in,
      axis: axisFromDelta(dx, dy, dz),
      compType,
      material: segment.material || 'Carbon steels, C ≤ 0.3%',
      sourceComponentUid: segment.sourceComponentUid,
    };
    fittingData[segment.id] = getSIFData(compType, od_in, wt_in, true, 'LR');
    return solverSegment;
  });

  return {
    schemaVersion: 'gc3d-input-v1',
    source: geometry?.source || 'canonical',
    unitSystem: 'imperial',
    nodes,
    segments,
    fittingData,
    includeSIF: options.includeSIF ?? true,
    params: options.params || {},
    diagnostics,
    warnings,
    summary: {
      sourceUnit: unit,
      nodeCount: Object.keys(nodes).length,
      segmentCount: segments.length,
      validationOk: validation.ok,
    },
  };
}
