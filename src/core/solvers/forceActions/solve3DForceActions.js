export const FORCE_ACTION_SOLVER_SCHEMA_VERSION = 'force-action-solver-3d-v18j2';

function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function diagnostic(severity, code, message, data = {}) {
  return { severity, code, message, data };
}

function pipeAreaM2(segment = {}) {
  const od_mm = finite(segment.pipe?.od_mm ?? segment.properties?.od_mm ?? segment.pipe?.dn ?? segment.properties?.bore);
  const wall_mm = finite(segment.pipe?.wall_mm ?? segment.properties?.wt);
  if (!od_mm || !wall_mm) return null;
  const id_mm = Math.max(0, od_mm - 2 * wall_mm);
  return {
    metalArea_m2: Math.PI / 4 * ((od_mm / 1000) ** 2 - (id_mm / 1000) ** 2),
    internalArea_m2: Math.PI / 4 * (id_mm / 1000) ** 2,
  };
}

function nodeVectorAdd(map, nodeId, fx = 0, fy = 0, fz = 0) {
  if (!nodeId) return;
  if (!map[nodeId]) map[nodeId] = { nodeId, fx_N: 0, fy_N: 0, fz_N: 0 };
  map[nodeId].fx_N += fx;
  map[nodeId].fy_N += fy;
  map[nodeId].fz_N += fz;
}

function axisVector(model, segment) {
  const a = model.nodes?.[segment.startNode]?.pos;
  const b = model.nodes?.[segment.endNode]?.pos;
  if (!a || !b) return [1, 0, 0];
  const dx = Number(b[0]) - Number(a[0]);
  const dy = Number(b[1]) - Number(a[1]);
  const dz = Number(b[2]) - Number(a[2]);
  const len = Math.hypot(dx, dy, dz) || 1;
  return [dx / len, dy / len, dz / len];
}

export function solve3DForceActions(model = {}, { supportLoadResult = null } = {}) {
  const diagnostics = [];
  const pressureThrust = [];
  const thermalAxial = [];
  const reducerImbalance = [];
  const supportFriction = [];
  const nodeForces = {};

  for (const segment of model.segments || []) {
    const type = String(segment.type || segment.properties?.type || 'PIPE').toUpperCase();
    const pressure_barg = finite(segment.operating?.designPressure_barg ?? segment.properties?.designPressure_barg) ?? 0;
    const pressure_Pa = pressure_barg * 1e5;
    const area = pipeAreaM2(segment);
    const dir = axisVector(model, segment);

    if (type === 'PIPE' && area && pressure_Pa > 0) {
      const thrust_N = pressure_Pa * area.internalArea_m2;
      pressureThrust.push({ segmentId: segment.id, formulaId: 'PRESSURE_THRUST_F_PA', pressure_Pa, area_m2: area.internalArea_m2, thrust_N });
      nodeVectorAdd(nodeForces, segment.startNode, -dir[0] * thrust_N, -dir[1] * thrust_N, -dir[2] * thrust_N);
      nodeVectorAdd(nodeForces, segment.endNode, dir[0] * thrust_N, dir[1] * thrust_N, dir[2] * thrust_N);

      const E_Pa = (finite(segment.pipe?.E_Pa) ?? 200e9);
      const alpha = finite(segment.pipe?.alpha_per_C) ?? 12e-6;
      const deltaT_C = finite(segment.operating?.designTemperature_C) !== null
        ? finite(segment.operating.designTemperature_C) - 20
        : 0;
      const restrained = segment.calculationFlags?.restrainedAxial === true
        || ['anchor', 'line_stop', 'linestop'].includes(String(model.nodes?.[segment.startNode]?.type).toLowerCase())
        || ['anchor', 'line_stop', 'linestop'].includes(String(model.nodes?.[segment.endNode]?.type).toLowerCase());

      if (restrained && deltaT_C !== 0) {
        const axial_N = E_Pa * area.metalArea_m2 * alpha * deltaT_C;
        thermalAxial.push({ segmentId: segment.id, formulaId: 'RESTRAINED_THERMAL_AXIAL_FORCE_E_A_ALPHA_DT', E_Pa, area_m2: area.metalArea_m2, alpha_per_C: alpha, deltaT_C, axial_N });
        nodeVectorAdd(nodeForces, segment.startNode, -dir[0] * axial_N, -dir[1] * axial_N, -dir[2] * axial_N);
        nodeVectorAdd(nodeForces, segment.endNode, dir[0] * axial_N, dir[1] * axial_N, dir[2] * axial_N);
      }
    }

    if (type === 'REDUCER') {
      const component = segment.componentData || model.components?.[segment.componentId] || {};
      const fromDn = finite(component.fromDn);
      const toDn = finite(component.toDn);
      if (pressure_Pa > 0 && fromDn && toDn) {
        const a1 = Math.PI / 4 * (fromDn / 1000) ** 2;
        const a2 = Math.PI / 4 * (toDn / 1000) ** 2;
        const imbalance_N = pressure_Pa * Math.abs(a1 - a2);
        reducerImbalance.push({ segmentId: segment.id, componentId: component.id, formulaId: 'REDUCER_PRESSURE_IMBALANCE_P_DELTA_A', pressure_Pa, deltaArea_m2: Math.abs(a1 - a2), imbalance_N });
        nodeVectorAdd(nodeForces, segment.startNode, -dir[0] * imbalance_N, -dir[1] * imbalance_N, -dir[2] * imbalance_N);
        nodeVectorAdd(nodeForces, segment.endNode, dir[0] * imbalance_N, dir[1] * imbalance_N, dir[2] * imbalance_N);
      } else {
        diagnostics.push(diagnostic('warn', 'REDUCER_PRESSURE_IMBALANCE_DATA_INCOMPLETE', `Reducer ${segment.id} has insufficient data for pressure imbalance.`, { segmentId: segment.id }));
      }
    }
  }

  for (const support of supportLoadResult?.supportLoads || []) {
    const node = model.nodes?.[support.nodeId] || {};
    const mu = finite(node.meta?.frictionCoefficient) ?? finite((model.supports || []).find((s) => s.nodeId === support.nodeId)?.frictionCoefficient) ?? 0.3;
    const normal_N = finite(support.verticalLoad_N) ?? 0;
    const frictionLimit_N = mu * normal_N;
    supportFriction.push({ nodeId: support.nodeId, formulaId: 'SUPPORT_FRICTION_LIMIT_MU_N', mu, normal_N, frictionLimit_N });
  }

  const nodeForceRows = Object.values(nodeForces).map((row) => ({
    ...row,
    resultant_N: Math.hypot(row.fx_N, row.fy_N, row.fz_N),
    formulaId: 'NODE_FORCE_VECTOR_SUMMARY',
  }));

  const errorCount = diagnostics.filter((item) => item.severity === 'error').length;
  const warningCount = diagnostics.filter((item) => item.severity === 'warn' || item.severity === 'warning').length;

  return {
    schemaVersion: FORCE_ACTION_SOLVER_SCHEMA_VERSION,
    status: errorCount ? 'NOT_QUALIFIED' : warningCount ? 'PASSED_WITH_WARNINGS' : 'PASSED',
    diagnostics,
    pressureThrust,
    reducerImbalance,
    thermalAxial,
    supportFriction,
    nodeForces: nodeForceRows,
    summary: {
      pressureThrustCount: pressureThrust.length,
      reducerImbalanceCount: reducerImbalance.length,
      thermalAxialCount: thermalAxial.length,
      supportFrictionCount: supportFriction.length,
      nodeForceCount: nodeForceRows.length,
    },
  };
}
