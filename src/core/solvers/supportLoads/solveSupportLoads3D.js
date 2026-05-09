export const SUPPORT_LOAD_SOLVER_SCHEMA_VERSION = 'support-load-solver-3d-v18i';

const G = 9.80665;

function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function diagnostic(severity, code, message, data = {}) {
  return { severity, code, message, data };
}

function distanceMm(nodes, aId, bId) {
  const a = nodes?.[aId]?.pos;
  const b = nodes?.[bId]?.pos;
  if (!a || !b) return null;
  return Math.hypot(Number(b[0]) - Number(a[0]), Number(b[1]) - Number(a[1]), Number(b[2]) - Number(a[2]));
}

function pipeSection(segment = {}) {
  const dn = finite(segment.pipe?.dn ?? segment.properties?.bore) ?? 100;
  const od_mm = finite(segment.pipe?.od_mm ?? segment.properties?.od_mm) ?? dn;
  const wall_mm = finite(segment.pipe?.wall_mm ?? segment.properties?.wt) ?? null;
  if (!wall_mm || wall_mm <= 0) return null;
  const id_mm = Math.max(0, od_mm - 2 * wall_mm);
  return { dn, od_mm, wall_mm, id_mm };
}

function segmentType(segment = {}) {
  return String(segment.type || segment.properties?.type || 'PIPE').toUpperCase();
}

function isSupportNode(model = {}, nodeId) {
  const node = model.nodes?.[nodeId];
  const t = String(node?.type || '').toLowerCase();
  if (['anchor', 'support', 'guide', 'line_stop', 'linestop', 'resting_support', 'spring'].includes(t)) return true;
  return (model.supports || []).some((support) => support.nodeId === nodeId || support.id === nodeId);
}

function distributeToSupports(model, supportLoads, segment, totalWeight_N, unassigned) {
  const startSupported = isSupportNode(model, segment.startNode);
  const endSupported = isSupportNode(model, segment.endNode);

  if (startSupported && endSupported) {
    supportLoads[segment.startNode] = (supportLoads[segment.startNode] || 0) + totalWeight_N / 2;
    supportLoads[segment.endNode] = (supportLoads[segment.endNode] || 0) + totalWeight_N / 2;
    return unassigned;
  }

  if (startSupported) {
    supportLoads[segment.startNode] = (supportLoads[segment.startNode] || 0) + totalWeight_N;
    return unassigned;
  }

  if (endSupported) {
    supportLoads[segment.endNode] = (supportLoads[segment.endNode] || 0) + totalWeight_N;
    return unassigned;
  }

  return unassigned + totalWeight_N;
}


function buildAdjacency(model = {}) {
  const adjacency = {};
  for (const segment of model.segments || []) {
    if (!segment.startNode || !segment.endNode) continue;
    adjacency[segment.startNode] = adjacency[segment.startNode] || [];
    adjacency[segment.endNode] = adjacency[segment.endNode] || [];
    adjacency[segment.startNode].push({ nodeId: segment.endNode, segmentId: segment.id });
    adjacency[segment.endNode].push({ nodeId: segment.startNode, segmentId: segment.id });
  }
  return adjacency;
}

function nearestSupportFromNode(model = {}, startNodeId, excludedSegmentId = null) {
  const adjacency = buildAdjacency(model);
  const visited = new Set([startNodeId]);
  const queue = [{ nodeId: startNodeId, distance: 0 }];

  while (queue.length) {
    const current = queue.shift();
    if (current.nodeId !== startNodeId && isSupportNode(model, current.nodeId)) {
      return current.nodeId;
    }

    for (const edge of adjacency[current.nodeId] || []) {
      if (edge.segmentId === excludedSegmentId) continue;
      if (visited.has(edge.nodeId)) continue;
      visited.add(edge.nodeId);
      queue.push({ nodeId: edge.nodeId, distance: current.distance + 1 });
    }
  }

  return null;
}

function distributeToNearestSupports(model, supportLoads, segment, totalWeight_N, unassigned) {
  const directBefore = unassigned;
  const afterDirect = distributeToSupports(model, supportLoads, segment, totalWeight_N, unassigned);
  if (afterDirect === directBefore) return afterDirect;

  const startNearest = nearestSupportFromNode(model, segment.startNode, segment.id);
  const endNearest = nearestSupportFromNode(model, segment.endNode, segment.id);

  if (startNearest && endNearest && startNearest !== endNearest) {
    supportLoads[startNearest] = (supportLoads[startNearest] || 0) + totalWeight_N / 2;
    supportLoads[endNearest] = (supportLoads[endNearest] || 0) + totalWeight_N / 2;
    return unassigned;
  }

  const oneSupport = startNearest || endNearest;
  if (oneSupport) {
    supportLoads[oneSupport] = (supportLoads[oneSupport] || 0) + totalWeight_N;
    return unassigned;
  }

  return afterDirect;
}

export function solveSupportLoads3D(model = {}) {
  const diagnostics = [];
  const segmentLoads = [];
  const componentLoads = [];
  const supportLoads = {};
  let unassignedWeight_N = 0;

  if (!Array.isArray(model.segments) || model.segments.length === 0) {
    diagnostics.push(diagnostic('error', 'SUPPORT_LOAD_MODEL_SEGMENTS_MISSING', 'Support load calculation requires at least one segment.', {}));
    return {
      schemaVersion: SUPPORT_LOAD_SOLVER_SCHEMA_VERSION,
      status: 'NOT_QUALIFIED',
      diagnostics,
      segmentLoads,
      componentLoads,
      supportLoads: [],
      summary: {
        totalPipeFluidInsulationWeight_N: 0,
        totalComponentWeight_N: 0,
        totalWeight_N: 0,
        assignedWeight_N: 0,
        unassignedWeight_N: 0,
        supportCount: 0,
      },
    };
  }

  for (const segment of model.segments || []) {
    const type = segmentType(segment);
    const length_mm = finite(segment.length_mm) ?? distanceMm(model.nodes, segment.startNode, segment.endNode) ?? 0;

    if (type !== 'PIPE') {
      const component = segment.componentData || model.components?.[segment.componentId];
      const kg = finite(component?.weight_kg ?? component?.totalWeight_kg);
      if (kg !== null && kg > 0) {
        const wN = kg * G;
        componentLoads.push({ segmentId: segment.id, componentId: component?.id || segment.componentId, weight_kg: kg, weight_N: wN });
        unassignedWeight_N = distributeToNearestSupports(model, supportLoads, segment, wN, unassignedWeight_N);
      }
      continue;
    }

    const section = pipeSection(segment);
    if (!section) {
      diagnostics.push(diagnostic('error', 'SUPPORT_LOAD_PIPE_SECTION_MISSING', `Pipe segment ${segment.id} is missing OD/wall thickness.`, { segmentId: segment.id }));
      continue;
    }

    const length_m = length_mm / 1000;
    const od_m = section.od_mm / 1000;
    const id_m = section.id_mm / 1000;
    const insulationThickness_m = (finite(segment.insulation?.thickness_mm ?? segment.properties?.insulation) ?? 0) / 1000;
    const insulationDensity = finite(segment.insulation?.density_kg_m3 ?? segment.properties?.insulationDensity_kg_m3) ?? 120;
    const fluidDensity = finite(segment.contents?.fluidDensity_kg_m3 ?? segment.properties?.fluidDensity_kg_m3) ?? 0;
    const fillFraction = finite(segment.contents?.fillFraction ?? segment.properties?.fillFraction) ?? 1;
    const steelDensity = finite(segment.pipe?.density_kg_m3) ?? 7850;

    const metalArea = Math.PI / 4 * (od_m ** 2 - id_m ** 2);
    const fluidArea = Math.PI / 4 * id_m ** 2 * fillFraction;
    const insulationOD = od_m + 2 * insulationThickness_m;
    const insulationArea = insulationThickness_m > 0 ? Math.PI / 4 * (insulationOD ** 2 - od_m ** 2) : 0;

    const pipeWeight_N = metalArea * length_m * steelDensity * G;
    const fluidWeight_N = fluidArea * length_m * fluidDensity * G;
    const insulationWeight_N = insulationArea * length_m * insulationDensity * G;
    const totalWeight_N = pipeWeight_N + fluidWeight_N + insulationWeight_N;

    segmentLoads.push({
      segmentId: segment.id,
      length_m,
      pipeWeight_N,
      fluidWeight_N,
      insulationWeight_N,
      totalWeight_N,
      weightPerMeter_N_m: length_m > 0 ? totalWeight_N / length_m : 0,
    });

    unassignedWeight_N = distributeToNearestSupports(model, supportLoads, segment, totalWeight_N, unassignedWeight_N);
  }

  const supportRows = Object.entries(supportLoads).map(([nodeId, verticalLoad_N]) => ({
    nodeId,
    verticalLoad_N,
    verticalLoad_kg: verticalLoad_N / G,
  }));

  const totalSegmentWeight_N = segmentLoads.reduce((sum, row) => sum + row.totalWeight_N, 0);
  const totalComponentWeight_N = componentLoads.reduce((sum, row) => sum + row.weight_N, 0);
  const assignedWeight_N = supportRows.reduce((sum, row) => sum + row.verticalLoad_N, 0);
  const errorCount = diagnostics.filter((item) => item.severity === 'error').length;

  return {
    schemaVersion: SUPPORT_LOAD_SOLVER_SCHEMA_VERSION,
    status: errorCount ? 'NOT_QUALIFIED' : 'PASSED',
    diagnostics,
    segmentLoads,
    componentLoads,
    supportLoads: supportRows,
    summary: {
      totalPipeFluidInsulationWeight_N: totalSegmentWeight_N,
      totalComponentWeight_N,
      totalWeight_N: totalSegmentWeight_N + totalComponentWeight_N,
      assignedWeight_N,
      unassignedWeight_N,
      supportCount: supportRows.length,
    },
  };
}
