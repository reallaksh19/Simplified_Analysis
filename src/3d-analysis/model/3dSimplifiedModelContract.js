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
    finite(segment.od_mm) ??
    (finite(segment.od_in) != null ? finite(segment.od_in) * 25.4 : null);

  const wall_mm =
    finite(segment.wall_mm) ??
    finite(segment.wt_mm) ??
    (finite(segment.wt_in) != null ? finite(segment.wt_in) * 25.4 : null);

  return {
    id,
    type: compType,
    startNode: text(segment.startNode),
    endNode: text(segment.endNode),
    length_mm,
    axis: text(segment.axis, 'UNSPECIFIED'),

    pipe: {
      dn_mm: finite(segment.dn_mm) ?? finite(segment.bore_mm) ?? null,
      od_mm,
      wall_mm,
      schedule: text(segment.schedule, ''),
      material: text(segment.material, 'UNSPECIFIED'),
    },

    lineClass: {
      ratingClass: finite(segment.ratingClass, null),
      faceType: text(segment.faceType, ''),
      flangeType: text(segment.flangeType, ''),
    },

    operating: {
      designTemperature_C: finite(segment.designTemperature_C, null),
      designPressure_barg: finite(segment.designPressure_barg, null),
    },

    contents: {
      fluidDensity_kg_m3: finite(segment.fluidDensity_kg_m3, null),
    },

    insulation: {
      thickness_mm: finite(segment.insulationThickness_mm, null),
      density_kg_m3: finite(segment.insulationDensity_kg_m3, null),
    },

    componentRefs: Array.isArray(segment.componentRefs) ? [...segment.componentRefs] : [],
    raw: clone(segment),
  };
}

function deriveSupportsFromNodes(nodes = {}) {
  return Object.entries(nodes)
    .filter(([, node]) => text(node.type).toLowerCase() === 'anchor' || text(node.type).toLowerCase() === 'support')
    .map(([id, node]) => ({
      id: `SUP-${id}`,
      nodeId: id,
      type: text(node.type, 'anchor'),
      restraint: {
        x: true,
        y: true,
        z: true,
        rx: false,
        ry: false,
        rz: false,
      },
      frictionFactor: finite(node.frictionFactor, null),
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
        restraint: {
          x: Boolean(support.restraint?.x ?? true),
          y: Boolean(support.restraint?.y ?? true),
          z: Boolean(support.restraint?.z ?? true),
          rx: Boolean(support.restraint?.rx ?? false),
          ry: Boolean(support.restraint?.ry ?? false),
          rz: Boolean(support.restraint?.rz ?? false),
        },
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