import { validateGeometry } from './validateGeometry.js';
import { addError, addWarning, hasErrors, filterBySeverity } from './geometryDiagnostics.js';
import { normalizeCanonicalGeometry } from './normalizeCanonicalGeometry.js';
import { DIAGNOSTIC_SEVERITIES, CANONICAL_GEOMETRY_SCHEMA_VERSION, ENTITY_TYPES, SUPPORTED_UNITS } from './geometrySchema.js';

export const validateCanonicalGeometry = (geometry, options = {}) => {
  const diagnostics = [];
  const errors = [];
  const warnings = [];
  const info = [];

  const addDiagToLocal = (targetArr, severity, code, message, data = {}) => {
    const diag = { severity, code, message, data };
    targetArr.push(diag);
    diagnostics.push(diag);
  };

  if (!geometry || typeof geometry !== 'object') {
     addDiagToLocal(errors, DIAGNOSTIC_SEVERITIES.ERROR, 'GEOM_NULL', 'Geometry is null or not an object.');
     return { ok: false, errors, warnings, info, diagnostics, summary: { nodeCount: 0, segmentCount: 0 } };
  }

  // 1. Schema version check
  // Although not strictly enforcing missing version to be fatal, it's a good warning
  if (!geometry.schemaVersion || geometry.schemaVersion !== CANONICAL_GEOMETRY_SCHEMA_VERSION) {
    addDiagToLocal(warnings, DIAGNOSTIC_SEVERITIES.WARNING, 'GEOM_SCHEMA_VERSION', `Expected schema version ${CANONICAL_GEOMETRY_SCHEMA_VERSION}, got ${geometry.schemaVersion}`);
  }

  // 2. Units check and normalization implicitly handled by normalize
  const normalizedGeometry = normalizeCanonicalGeometry(geometry);
  if (!geometry.unit || geometry.unit === 'unknown') {
    addDiagToLocal(errors, DIAGNOSTIC_SEVERITIES.ERROR, 'GEOM_UNIT_MISSING', 'Geometry unit is missing or unknown. It must be specified.');
  } else if (!SUPPORTED_UNITS.LENGTH.includes(geometry.unit.toLowerCase())) {
     addDiagToLocal(errors, DIAGNOSTIC_SEVERITIES.ERROR, 'GEOM_UNIT_UNSUPPORTED', `Unsupported unit: ${geometry.unit}`);
  }

  // Delegate core geometry checks to validateGeometry
  const baseValidation = validateGeometry(normalizedGeometry, { tolerance: options.tolerance, requireKnownUnit: false });

  // Merge base validation diagnostics
  baseValidation.errors.forEach(e => addDiagToLocal(errors, DIAGNOSTIC_SEVERITIES.ERROR, e.code, e.message, e.data));
  baseValidation.warnings.forEach(w => addDiagToLocal(warnings, DIAGNOSTIC_SEVERITIES.WARNING, w.code, w.message, w.data));

  // Additional Canonical Checks

  const nodeIds = new Set(normalizedGeometry.nodes.map(n => n.id));
  const segmentIds = new Set(normalizedGeometry.segments.map(s => s.id));

  // 7. Components reference existing segment or node anchors.
  if (normalizedGeometry.components) {
    const componentIds = new Set();
    normalizedGeometry.components.forEach((comp, idx) => {
      if (!comp.id) {
         addDiagToLocal(errors, DIAGNOSTIC_SEVERITIES.ERROR, 'COMPONENT_ID_MISSING', `Component at index ${idx} is missing an ID.`);
      } else if (componentIds.has(comp.id)) {
         addDiagToLocal(errors, DIAGNOSTIC_SEVERITIES.ERROR, 'COMPONENT_ID_DUPLICATE', `Duplicate component ID: ${comp.id}`);
      } else {
         componentIds.add(comp.id);
      }

      if (comp.segmentId && !segmentIds.has(comp.segmentId)) {
        addDiagToLocal(errors, DIAGNOSTIC_SEVERITIES.ERROR, 'COMPONENT_SEGMENT_MISSING', `Component ${comp.id} references missing segment ${comp.segmentId}.`);
      }
      if (comp.nodeId && !nodeIds.has(comp.nodeId)) {
        addDiagToLocal(errors, DIAGNOSTIC_SEVERITIES.ERROR, 'COMPONENT_NODE_MISSING', `Component ${comp.id} references missing node ${comp.nodeId}.`);
      }
    });
  }

  // 8. Supports reference existing nodes or segments.
  if (normalizedGeometry.supports) {
     const supportIds = new Set();
     normalizedGeometry.supports.forEach((supp, idx) => {
       if (!supp.id) {
          addDiagToLocal(errors, DIAGNOSTIC_SEVERITIES.ERROR, 'SUPPORT_ID_MISSING', `Support at index ${idx} is missing an ID.`);
       } else if (supportIds.has(supp.id)) {
          addDiagToLocal(errors, DIAGNOSTIC_SEVERITIES.ERROR, 'SUPPORT_ID_DUPLICATE', `Duplicate support ID: ${supp.id}`);
       } else {
          supportIds.add(supp.id);
       }

       if (supp.nodeId && !nodeIds.has(supp.nodeId)) {
          addDiagToLocal(errors, DIAGNOSTIC_SEVERITIES.ERROR, 'SUPPORT_NODE_MISSING', `Support ${supp.id} references missing node ${supp.nodeId}.`);
       }
       if (supp.segmentId && !segmentIds.has(supp.segmentId)) {
          addDiagToLocal(errors, DIAGNOSTIC_SEVERITIES.ERROR, 'SUPPORT_SEGMENT_MISSING', `Support ${supp.id} references missing segment ${supp.segmentId}.`);
       }
     });
  }

  // 9. Required calculation fields
  normalizedGeometry.segments.forEach(seg => {
     // If it's a pipe, bend, elbow, tee etc
     if (['PIPE', 'BEND', 'ELBOW', 'TEE', 'VALVE', 'FLANGE'].includes(seg.type)) {
       if (typeof seg.diameter !== 'number' || isNaN(seg.diameter)) {
          addDiagToLocal(warnings, DIAGNOSTIC_SEVERITIES.WARNING, 'SEGMENT_DIAMETER_MISSING', `Segment ${seg.id} is missing diameter or bore.`);
       }
       if (typeof seg.thickness !== 'number' || isNaN(seg.thickness)) {
          addDiagToLocal(warnings, DIAGNOSTIC_SEVERITIES.WARNING, 'SEGMENT_THICKNESS_MISSING', `Segment ${seg.id} is missing wall thickness.`);
       }
       if (!seg.material || typeof seg.material !== 'string') {
          addDiagToLocal(warnings, DIAGNOSTIC_SEVERITIES.WARNING, 'SEGMENT_MATERIAL_MISSING', `Segment ${seg.id} is missing material property.`);
       }
     }
  });

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    info,
    diagnostics,
    normalizedGeometry,
    summary: {
      nodeCount: normalizedGeometry.nodes.length,
      segmentCount: normalizedGeometry.segments.length,
      errorCount: errors.length,
      warningCount: warnings.length,
    }
  };
};
