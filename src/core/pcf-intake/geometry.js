import { pcfToCanonicalGeometry } from '../geometry/adapters/pcfToCanonicalGeometry.js';
import { canonicalStringify, deepFreeze } from '../shared-piping-model/index.js';
import { pcfDiagnostic } from './diagnostics.js';

export function buildPcfCanonicalGeometry(components, units, diagnostics) {
  if (!units.coordinate?.scaleToMm || (units.bore && !units.bore.scaleToMm)) return null;
  try {
    const converted = components.map((row) => ({
      id: row.componentId, type: row.type, points: row.pointsMm,
      centrePoint: row.centrePointMm, branch1Point: row.branchPointsMm[0] || null,
      branch2Point: row.branchPointsMm[1] || null, branch3Point: row.branchPointsMm[2] || null,
      coOrds: row.coOrdsMm, coords: row.coOrdsMm, bore: row.boreMm || 0, attributes: row.attributes,
    }));
    return deepFreeze(pcfToCanonicalGeometry(converted, { source: 'pcf', unit: 'mm', tolerance: 0.001 }));
  } catch (error) {
    diagnostics.push(pcfDiagnostic('ERROR', 'PCF_CANONICAL_PROJECTION_FAILED', error instanceof Error ? error.message : String(error)));
    return null;
  }
}

export function addPcfCanonicalDiagnostics(geometry, diagnostics) {
  if (!geometry) return;
  (geometry.diagnostics || []).forEach((row) => {
    const level = String(row?.severity || '').toLowerCase();
    const severity = level === 'error' ? 'ERROR' : level === 'warn' ? 'WARNING' : 'INFO';
    diagnostics.push(pcfDiagnostic(severity, String(row?.code || 'PCF_CANONICAL_DIAGNOSTIC'), String(row?.message || 'Canonical geometry diagnostic.'), row?.data || {}));
  });
  if (geometry.valid !== true) diagnostics.push(pcfDiagnostic('ERROR', 'PCF_CANONICAL_GEOMETRY_INVALID', 'Canonical geometry validation failed.'));
  if (!geometry.summary?.segmentCount) diagnostics.push(pcfDiagnostic('ERROR', 'PCF_CANONICAL_SEGMENTS_EMPTY', 'Canonical geometry contains no model segments.'));
}

export function pcfCanonicalGeometryIdentity(geometry) {
  if (!geometry) return null;
  const coordinates = new Map((geometry.nodes || []).map((node) => [node.id, [node.x, node.y, node.z]]));
  const nodes = (geometry.nodes || []).map((node) => ({ point: [node.x, node.y, node.z], restraint: node.restraint || null }))
    .sort((a, b) => pointKey(a.point).localeCompare(pointKey(b.point)));
  const segments = (geometry.segments || []).map((segment) => ({
    endpoints: [coordinates.get(segment.startNodeId), coordinates.get(segment.endNodeId)].sort((a, b) => pointKey(a).localeCompare(pointKey(b))),
    type: segment.type, sourceComponentUid: segment.sourceComponentUid || null,
    length: segment.length ?? null, diameter: segment.diameter ?? null, material: segment.material || null,
    segmentRole: segment.meta?.segmentRole || null, parentType: segment.meta?.parentType || null,
  })).sort((a, b) => canonicalStringify(a).localeCompare(canonicalStringify(b)));
  return {
    schemaVersion: geometry.schemaVersion, source: geometry.source, unit: geometry.unit,
    valid: geometry.valid === true, nodes, segments,
    diagnostics: (geometry.diagnostics || []).map((row) => ({ severity: row?.severity || null, code: row?.code || null, message: row?.message || null }))
      .sort((a, b) => canonicalStringify(a).localeCompare(canonicalStringify(b))),
  };
}
function pointKey(point) { return (point || []).map((value) => Number(value)).join('|'); }
