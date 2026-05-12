export const MODEL_3D_SIMPLIFIED_SCHEMA_VERSION = '3d-simplified-model-v1';

function finite(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function text(value, fallback = '') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function bool(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value == null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['true', 'yes', 'y', '1'].includes(normalized)) return true;
  if (['false', 'no', 'n', '0'].includes(normalized)) return false;
  return fallback;
}

function normalizeRestraint(restraint = {}) {
  return {
    x: bool(restraint.x, true),
    y: bool(restraint.y, true),
    z: bool(restraint.z, true),
    rx: bool(restraint.rx, false),
    ry: bool(restraint.ry, false),
    rz: bool(restraint.rz, false),
  };
}

function toPoint3(node = {}) {
  const pos = Array.isArray(node.pos) ? node.pos : [node.x, node.y, node.z];

  return {
    x_mm: finite(pos?.[0], 0),
    y_mm: finite(pos?.[1], 0),
    z_mm: finite(pos?.[2], 0),
  };
}

function normalizeNode(id, node = {}) {
  return {
    id,
    type: text(node.type, 'free'),
    label: text(node.label, id),
    point: toPoint3(node),

    // Slice E — preserve support properties for support-load solver.
    supportType: text(node.supportType, ''),
    supportTag: text(node.supportTag, ''),
    restraint: normalizeRestraint(node.restraint || {}),
    frictionFactor: finite(node.frictionFactor, null),

    raw: clone(node),
  };
}

function normalizeSegment(segment = {}, index = 0) {
  const id = text(segment.id, `SEG-${index + 1}`);
  const compType = text(segment.compType || segment.type, 'PIPE').toUpperCase();

  const length_mm =
    finite(segment.length_mm) ??
    (finite(segment.length_in) != null ? finite(segment.length_in) * 25.4 : null);

  const od_mm =
    finite(segment.pipe?.od_mm) ??
    finite(segment.properties?.pipe?.od_mm) ??
    finite(segment.od_mm) ??
    (finite(segment.od_in) != null ? finite(segment.od_in) * 25.4 : null);

  const wall_mm =
    finite(segment.pipe?.wall_mm) ??
    finite(segment.properties?.pipe?.wall_mm) ??
    finite(segment.wall_mm) ??
    finite(segment.wt_mm) ??
    (finite(segment.wt_in) != null ? finite(segment.wt_in) * 25.4 : null);

  const dn_mm =
    finite(segment.pipe?.dn_mm) ??
    finite(segment.properties?.pipe?.dn_mm) ??
    finite(segment.dn_mm) ??
    finite(segment.bore_mm) ??
    finite(segment.bore) ??
    null;

  return {
    id,
    type: compType,
    startNode: text(segment.startNode),
    endNode: text(segment.endNode),
    length_mm,
    axis: text(segment.axis, 'UNSPECIFIED'),

    pipe: {
      dn_mm,
      nps: text(segment.pipe?.nps || segment.properties?.pipe?.nps || segment.nps, ''),
      od_mm,
      wall_mm,
      schedule: text(segment.pipe?.schedule || segment.properties?.pipe?.schedule || segment.schedule, ''),
      material: text(segment.pipe?.material || segment.properties?.pipe?.material || segment.material, 'UNSPECIFIED'),

      // Slice E / M — support-load solver input.
      materialDensity_kg_m3:
        finite(segment.pipe?.materialDensity_kg_m3) ??
        finite(segment.properties?.pipe?.materialDensity_kg_m3) ??
        finite(segment.materialDensity_kg_m3) ??
        null,
    },

    lineClass: {
      ratingClass: finite(segment.lineClass?.ratingClass ?? segment.properties?.lineClass?.ratingClass ?? segment.ratingClass, null),
      faceType: text(segment.lineClass?.faceType || segment.properties?.lineClass?.faceType || segment.faceType, ''),
      flangeType: text(segment.lineClass?.flangeType || segment.properties?.lineClass?.flangeType || segment.flangeType, ''),
    },

    operating: {
      designTemperature_C: finite(segment.operating?.designTemperature_C ?? segment.properties?.operating?.designTemperature_C ?? segment.designTemperature_C, null),
      designPressure_barg: finite(segment.operating?.designPressure_barg ?? segment.properties?.operating?.designPressure_barg ?? segment.designPressure_barg, null),
    },

    contents: {
      fluidDensity_kg_m3: finite(segment.contents?.fluidDensity_kg_m3 ?? segment.properties?.contents?.fluidDensity_kg_m3 ?? segment.fluidDensity_kg_m3, null),
    },

    insulation: {
      thickness_mm: finite(segment.insulation?.thickness_mm ?? segment.properties?.insulation?.thickness_mm ?? segment.insulationThickness_mm, null),
      density_kg_m3: finite(segment.insulation?.density_kg_m3 ?? segment.properties?.insulation?.density_kg_m3 ?? segment.insulationDensity_kg_m3, null),
    },

    component: {
      componentWeight_kg: finite(segment.component?.componentWeight_kg ?? segment.properties?.component?.componentWeight_kg ?? segment.componentWeight_kg, null),
      componentLength_mm: finite(segment.component?.componentLength_mm ?? segment.properties?.component?.componentLength_mm ?? segment.componentLength_mm, null),
    },

    provenance: {
      propertySource: text(segment.propertySource, ''),
      sourceSegmentId: text(segment.sourceSegmentId, segment.id || ''),
      masterDbRowId: text(segment.masterDbRowId, ''),
      masterDbVersion: text(segment.masterDbVersion, ''),
      masterDbProvenance: clone(segment.masterDbProvenance || null),
    },

    componentRefs: Array.isArray(segment.componentRefs) ? [...segment.componentRefs] : [],
    raw: clone(segment),
  };
}

function deriveSupportsFromNodes(nodes = {}) {
  return Object.entries(nodes)
    .filter(([, node]) => {
      const nodeType = text(node.type).toLowerCase();
      const supportType = text(node.support?.supportType || node.supportType).toLowerCase();
      return ['anchor', 'support', 'guide', 'rest'].includes(nodeType)
        || ['anchor', 'support', 'guide', 'rest'].includes(supportType);
    })
    .map(([id, node]) => ({
      id: text(node.supportTag, `SUP-${id}`),
      nodeId: id,
      type: text(node.support?.supportType || node.supportType || node.type, 'support'),
      restraint: {
        x: Boolean(node.support?.restraint?.x ?? node.restraint?.x ?? true),
        y: Boolean(node.support?.restraint?.y ?? node.restraint?.y ?? true),
        z: Boolean(node.support?.restraint?.z ?? node.restraint?.z ?? true),
        rx: Boolean(node.support?.restraint?.rx ?? node.restraint?.rx ?? false),
        ry: Boolean(node.support?.restraint?.ry ?? node.restraint?.ry ?? false),
        rz: Boolean(node.support?.restraint?.rz ?? node.restraint?.rz ?? false),
      },
      frictionFactor: finite(node.support?.frictionFactor ?? node.frictionFactor, null),
      raw: clone(node),
    }));
}

export function build3DSimplifiedModelContract({
  nodes = {},
  segments = [],
  components = {},
  supports = null,
  fittingData = {},
  params = {},
  source = 'analysis-store',
} = {}) {
  const normalizedNodes = Object.fromEntries(
    Object.entries(nodes || {}).map(([id, node]) => [id, normalizeNode(id, node)])
  );

  const normalizedSegments = (segments || []).map(normalizeSegment);

  const normalizedSupports = Array.isArray(supports)
    ? supports.map((support, index) => ({
        id: text(support.id, `SUP-${index + 1}`),
        nodeId: text(support.nodeId),
        type: text(support.type, 'support'),
        restraint: normalizeRestraint(support.restraint),
        frictionFactor: finite(support.frictionFactor, null),
        raw: clone(support),
      }))
    : deriveSupportsFromNodes(normalizedNodes);

  return {
    schemaVersion: MODEL_3D_SIMPLIFIED_SCHEMA_VERSION,
    source,
    units: {
      length: 'mm',
      mass: 'kg',
      force: 'N',
      pressure: 'barg',
      temperature: 'C',
    },
    nodes: normalizedNodes,
    segments: normalizedSegments,
    components: clone(components || {}),
    supports: normalizedSupports,
    globalParameters: clone(params || {}),
    masterDbProvenance: {
      componentRows: [],
      fittingRows: [],
      unresolvedRows: [],
    },
    fittingData: clone(fittingData || {}),
    diagnostics: [],
  };
}

export function validate3DSimplifiedModelContract(model = {}) {
  const diagnostics = [];

  if (model.schemaVersion !== MODEL_3D_SIMPLIFIED_SCHEMA_VERSION) {
    diagnostics.push({
      severity: 'error',
      code: 'MODEL_SCHEMA_VERSION_INVALID',
      message: `Expected ${MODEL_3D_SIMPLIFIED_SCHEMA_VERSION}.`,
    });
  }

  const nodes = model.nodes || {};
  const segments = Array.isArray(model.segments) ? model.segments : [];
  const supports = Array.isArray(model.supports) ? model.supports : [];

  if (Object.keys(nodes).length === 0) {
    diagnostics.push({
      severity: 'error',
      code: 'MODEL_NODES_EMPTY',
      message: '3D Simplified model has no nodes.',
    });
  }

  if (segments.length === 0) {
    diagnostics.push({
      severity: 'error',
      code: 'MODEL_SEGMENTS_EMPTY',
      message: '3D Simplified model has no pipe/fitting segments.',
    });
  }

  for (const segment of segments) {
    if (!segment.id) {
      diagnostics.push({
        severity: 'error',
        code: 'MODEL_SEGMENT_ID_MISSING',
        message: 'A segment is missing id.',
      });
    }

    if (!nodes[segment.startNode]) {
      diagnostics.push({
        severity: 'error',
        code: 'MODEL_SEGMENT_START_NODE_MISSING',
        message: `Segment ${segment.id} references missing start node ${segment.startNode}.`,
        data: { segmentId: segment.id, startNode: segment.startNode },
      });
    }

    if (!nodes[segment.endNode]) {
      diagnostics.push({
        severity: 'error',
        code: 'MODEL_SEGMENT_END_NODE_MISSING',
        message: `Segment ${segment.id} references missing end node ${segment.endNode}.`,
        data: { segmentId: segment.id, endNode: segment.endNode },
      });
    }

    if (!(segment.length_mm > 0)) {
      diagnostics.push({
        severity: 'error',
        code: 'MODEL_SEGMENT_LENGTH_INVALID',
        message: `Segment ${segment.id} has invalid or missing length.`,
        data: { segmentId: segment.id, length_mm: segment.length_mm },
      });
    }

    if (!segment.pipe?.material || segment.pipe.material === 'UNSPECIFIED') {
      diagnostics.push({
        severity: 'warn',
        code: 'MODEL_SEGMENT_MATERIAL_UNSPECIFIED',
        message: `Segment ${segment.id} has no assigned material.`,
        data: { segmentId: segment.id },
      });
    }

    if (!(segment.pipe?.materialDensity_kg_m3 > 0)) {
      diagnostics.push({
        severity: 'warn',
        code: 'MODEL_SEGMENT_MATERIAL_DENSITY_MISSING',
        message: `Segment ${segment.id} has no assigned material density. Support-load solver will use fallback density if executed.`,
        data: { segmentId: segment.id },
      });
    }

    if (!(segment.pipe?.wall_mm > 0)) {
      diagnostics.push({
        severity: 'warn',
        code: 'MODEL_SEGMENT_WALL_THICKNESS_MISSING',
        message: `Segment ${segment.id} has no assigned wall thickness.`,
        data: { segmentId: segment.id },
      });
    }

    if (!(segment.contents?.fluidDensity_kg_m3 >= 0)) {
      diagnostics.push({
        severity: 'warn',
        code: 'MODEL_SEGMENT_FLUID_DENSITY_MISSING',
        message: `Segment ${segment.id} has no assigned fluid density.`,
        data: { segmentId: segment.id },
      });
    }
  }

  for (const support of supports) {
    if (!nodes[support.nodeId]) {
      diagnostics.push({
        severity: 'error',
        code: 'MODEL_SUPPORT_NODE_MISSING',
        message: `Support ${support.id} references missing node ${support.nodeId}.`,
        data: { supportId: support.id, nodeId: support.nodeId },
      });
    }
  }

  const errors = diagnostics.filter((item) => item.severity === 'error').length;
  const warnings = diagnostics.filter((item) => item.severity === 'warn' || item.severity === 'warning').length;

  return {
    schemaVersion: `${MODEL_3D_SIMPLIFIED_SCHEMA_VERSION}-validation`,
    status: errors ? 'BLOCKED' : warnings ? 'PASSED_WITH_WARNINGS' : 'READY',
    counts: {
      nodes: Object.keys(nodes).length,
      segments: segments.length,
      components: Object.keys(model.components || {}).length,
      supports: supports.length,
      diagnostics: diagnostics.length,
      errors,
      warnings,
    },
    diagnostics,
  };
}

export function build3DSimplifiedModelSummary(model = {}) {
  return {
    schemaVersion: `${MODEL_3D_SIMPLIFIED_SCHEMA_VERSION}-summary`,
    nodes: Object.keys(model.nodes || {}).length,
    segments: Array.isArray(model.segments) ? model.segments.length : 0,
    components: Object.keys(model.components || {}).length,
    supports: Array.isArray(model.supports) ? model.supports.length : 0,
  };
}

export function build3DSimplifiedPropertySummary(model = {}) {
  const segments = Array.isArray(model.segments) ? model.segments : [];
  const supports = Array.isArray(model.supports) ? model.supports : [];

  const pipeMaterials = new Set();
  const schedules = new Set();
  const ratings = new Set();

  let pipeSegments = 0;
  let componentSegments = 0;
  let segmentsWithFluidDensity = 0;
  let segmentsWithInsulation = 0;
  let segmentsWithComponentWeight = 0;

  for (const segment of segments) {
    if (segment.type === 'PIPE') pipeSegments += 1;
    if (segment.type !== 'PIPE') componentSegments += 1;

    if (segment.pipe?.material) pipeMaterials.add(segment.pipe.material);
    if (segment.pipe?.schedule) schedules.add(segment.pipe.schedule);
    if (segment.lineClass?.ratingClass != null) ratings.add(String(segment.lineClass.ratingClass));

    if (segment.contents?.fluidDensity_kg_m3 != null) segmentsWithFluidDensity += 1;
    if (
      segment.insulation?.thickness_mm != null &&
      segment.insulation?.density_kg_m3 != null
    ) {
      segmentsWithInsulation += 1;
    }
    if (Number(segment.component?.componentWeight_kg) > 0) {
      segmentsWithComponentWeight += 1;
    }
  }

  return {
    schemaVersion: `${MODEL_3D_SIMPLIFIED_SCHEMA_VERSION}-property-summary`,
    pipeSegments,
    componentSegments,
    supports: supports.length,
    materials: [...pipeMaterials],
    schedules: [...schedules],
    ratings: [...ratings],
    segmentsWithFluidDensity,
    segmentsWithInsulation,
    segmentsWithComponentWeight,
  };
}
