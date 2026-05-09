export const SKETCHER_TO_3D_CALC_MODEL_SCHEMA_VERSION = 'sketcher-to-3d-calculation-model-v18g';

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function diagnostic(severity, code, message, data = {}) {
  return { severity, code, message, data };
}

function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function nodePos(nodes, id) {
  return nodes?.[id]?.pos || null;
}

function distanceMm(a, b) {
  if (!a || !b) return null;
  return Math.hypot(
    Number(b[0]) - Number(a[0]),
    Number(b[1]) - Number(a[1]),
    Number(b[2]) - Number(a[2]),
  );
}

function normalizeNode(id, node = {}) {
  return {
    id,
    pos: Array.isArray(node.pos) ? node.pos.map(Number) : [0, 0, 0],
    type: node.type || 'free',
    label: node.label || id,
    meta: clone(node.meta || {}),
    rawAttributes: clone(node.rawAttributes || {}),
  };
}

function normalizeSegment(segment = {}, nodes = {}) {
  const a = nodePos(nodes, segment.startNode);
  const b = nodePos(nodes, segment.endNode);
  const length_mm = finite(segment.length_mm) ?? distanceMm(a, b);

  return {
    id: segment.id,
    type: segment.type || segment.properties?.type || 'PIPE',
    startNode: segment.startNode,
    endNode: segment.endNode,
    length_mm,

    pipe: clone(segment.pipe || {}),
    lineClass: clone(segment.lineClass || {}),
    operating: clone(segment.operating || {}),
    contents: clone(segment.contents || {}),
    insulation: clone(segment.insulation || {}),
    calculationFlags: clone(segment.calculationFlags || {}),

    properties: clone(segment.properties || {}),
    componentId: segment.componentId || null,
    componentData: clone(segment.componentData || segment.derived?.componentData || null),

    rawAttributes: clone(segment.rawAttributes || {}),
    normalized: clone(segment.normalized || {}),
    derived: clone(segment.derived || {}),
  };
}

function collectSupports(nodes = {}) {
  const supportTypes = new Set(['anchor', 'support', 'guide', 'line_stop', 'linestop', 'resting_support', 'spring']);
  return Object.entries(nodes)
    .map(([id, node]) => normalizeNode(id, node))
    .filter((node) => supportTypes.has(String(node.type || '').toLowerCase()))
    .map((node) => ({
      id: node.id,
      nodeId: node.id,
      type: node.type,
      restraint: {
        vertical: true,
        axial: ['anchor', 'line_stop', 'linestop'].includes(String(node.type).toLowerCase()),
        lateral: ['anchor', 'guide'].includes(String(node.type).toLowerCase()),
      },
      frictionCoefficient: node.meta?.frictionCoefficient ?? 0.3,
      verticalLoad_N: null,
      rawAttributes: clone(node.rawAttributes || {}),
    }));
}

function buildPipePropertiesIndex(segments = []) {
  const pipeProperties = {};
  for (const segment of segments) {
    pipeProperties[segment.id] = {
      pipe: clone(segment.pipe || {}),
      lineClass: clone(segment.lineClass || {}),
      operating: clone(segment.operating || {}),
      contents: clone(segment.contents || {}),
      insulation: clone(segment.insulation || {}),
      calculationFlags: clone(segment.calculationFlags || {}),
    };
  }
  return pipeProperties;
}

export function validate3DCalculationModel(model = {}) {
  const diagnostics = [];

  if (!model.nodes || Object.keys(model.nodes).length === 0) {
    diagnostics.push(diagnostic('error', 'MODEL_NODES_MISSING', '3D calculation model has no nodes.'));
  }

  if (!Array.isArray(model.segments) || model.segments.length === 0) {
    diagnostics.push(diagnostic('error', 'MODEL_SEGMENTS_MISSING', '3D calculation model has no segments.'));
  }

  for (const segment of model.segments || []) {
    if (!segment.startNode || !segment.endNode || !model.nodes?.[segment.startNode] || !model.nodes?.[segment.endNode]) {
      diagnostics.push(diagnostic('error', 'MODEL_SEGMENT_NODE_REFERENCE_INVALID', `Segment ${segment.id} has invalid node reference.`, { segmentId: segment.id }));
    }

    if (String(segment.type || segment.properties?.type || 'PIPE').toUpperCase() === 'PIPE') {
      if (!segment.pipe?.dn && !segment.properties?.bore) {
        diagnostics.push(diagnostic('warn', 'MODEL_PIPE_DN_MISSING', `Pipe segment ${segment.id} is missing DN/bore.`, { segmentId: segment.id }));
      }
      if (!segment.pipe?.wall_mm && !segment.properties?.wt) {
        diagnostics.push(diagnostic('warn', 'MODEL_PIPE_WALL_MISSING', `Pipe segment ${segment.id} is missing wall thickness.`, { segmentId: segment.id }));
      }
    }
  }

  return {
    ok: diagnostics.every((item) => item.severity !== 'error'),
    status: diagnostics.some((item) => item.severity === 'error') ? 'NOT_QUALIFIED' : diagnostics.length ? 'PASSED_WITH_WARNINGS' : 'PASSED',
    diagnostics,
  };
}

export function build3DCalculationModelFromSketcher({
  nodes = {},
  segments = [],
  components = {},
  settings = {},
} = {}) {
  const normalizedNodes = Object.fromEntries(
    Object.entries(nodes || {}).map(([id, node]) => [id, normalizeNode(id, node)]),
  );

  const normalizedSegments = (segments || []).map((segment) => normalizeSegment(segment, nodes));

  const model = {
    schemaVersion: SKETCHER_TO_3D_CALC_MODEL_SCHEMA_VERSION,
    source: '2D_SKETCHER',
    createdAt: new Date(0).toISOString(),

    nodes: normalizedNodes,
    segments: normalizedSegments,
    components: clone(components || {}),
    supports: collectSupports(nodes),

    pipeProperties: buildPipePropertiesIndex(normalizedSegments),
    settings: clone(settings || {}),

    loadCases: [
      {
        id: 'LC-DEADWEIGHT',
        type: 'DEADWEIGHT',
        description: 'Pipe + fluid + insulation + component deadweight',
      },
      {
        id: 'LC-THERMAL',
        type: 'THERMAL',
        description: 'Guided-cantilever thermal screening',
      },
      {
        id: 'LC-FORCE-ACTIONS',
        type: 'FORCE_ACTIONS',
        description: 'Pressure thrust, thermal axial, reducer imbalance and friction capacity',
      },
    ],

    diagnostics: [],
    lossContract: [],
    derived: {
      calculationReady: false,
      nodeCount: Object.keys(normalizedNodes).length,
      segmentCount: normalizedSegments.length,
      componentCount: Object.keys(components || {}).length,
      supportCount: collectSupports(nodes).length,
    },
  };

  const validation = validate3DCalculationModel(model);

  return {
    ...model,
    diagnostics: validation.diagnostics,
    derived: {
      ...model.derived,
      calculationReady: validation.ok,
      validationStatus: validation.status,
    },
  };
}
