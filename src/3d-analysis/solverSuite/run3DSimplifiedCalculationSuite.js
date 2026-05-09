import { solveGC3D } from '../../solvers/3d/solveGC3D.js';
import { solveSupportLoads3D } from '../../core/solvers/supportLoads/solveSupportLoads3D.js';
import { solve3DForceActions } from '../../core/solvers/forceActions/solve3DForceActions.js';

export const SIMPLIFIED_3D_SUITE_SCHEMA_VERSION = 'simplified-3d-suite-v18j';

function mmToIn(value) {
  return Number(value || 0) / 25.4;
}

function dominantAxis(a, b) {
  const dx = Math.abs(Number(b[0]) - Number(a[0]));
  const dy = Math.abs(Number(b[1]) - Number(a[1]));
  const dz = Math.abs(Number(b[2]) - Number(a[2]));
  if (dy > dx && dy > dz) return 'Y';
  if (dz > dx && dz > dy) return 'Z';
  return 'X';
}

export function buildGC3DPayloadFromCalculationModel(model = {}, params = {}) {
  const nodes = {};
  const segments = [];
  const fittingData = {};

  for (const [id, node] of Object.entries(model.nodes || {})) {
    nodes[id] = {
      pos: node.pos,
      type: node.type || 'free',
      label: node.label || id,
    };
  }

  for (const segment of model.segments || []) {
    const type = String(segment.type || segment.properties?.type || 'PIPE').toUpperCase();
    if (!['PIPE', 'ELBOW', 'BEND', 'TEE'].includes(type)) continue;

    const start = model.nodes?.[segment.startNode]?.pos;
    const end = model.nodes?.[segment.endNode]?.pos;
    if (!start || !end) continue;

    const od_in = mmToIn(segment.pipe?.od_mm ?? segment.properties?.od_mm ?? segment.pipe?.dn ?? segment.properties?.bore ?? 100);
    const wt_in = mmToIn(segment.pipe?.wall_mm ?? segment.properties?.wt ?? 6.0);

    const gcSegment = {
      id: segment.id,
      startNode: segment.startNode,
      endNode: segment.endNode,
      compType: type === 'PIPE' ? 'PIPE' : type,
      axis: dominantAxis(start, end),
      length_in: mmToIn(segment.length_mm),
      od_in,
      wt_in,
      material: segment.pipe?.material ?? segment.properties?.material ?? 'Carbon steels, C ≤ 0.3%',
    };

    segments.push(gcSegment);
    fittingData[gcSegment.id] = {
      sif: 1,
      kFactor: 1,
      source: 'V18J_SCREENING_DEFAULT',
    };
  }

  return {
    nodes,
    segments,
    fittingData,
    includeSIF: true,
    activeSolver: 'GC3D',
    params: {
      deltaT_F: params.deltaT_F ?? 380,
      installTemp_F: params.installTemp_F ?? 70,
      designTemp_F: params.designTemp_F ?? 450,
      E_psi: params.E_psi ?? 27000000,
      alpha_in_in_F: params.alpha_in_in_F ?? 6.72e-6,
      Sc_psi: params.Sc_psi ?? 20000,
      Sh_psi: params.Sh_psi ?? 19400,
      f: params.f ?? 1.0,
      Sa_psi: params.Sa_psi ?? 29850,
    },
  };
}

export function runGuidedCantileverFromCalculationModel(model = {}, params = {}) {
  try {
    const payload = buildGC3DPayloadFromCalculationModel(model, params);
    if (!payload.segments.length) {
      return {
        status: 'NOT_QUALIFIED',
        diagnostics: [{ severity: 'error', code: 'GC3D_PAYLOAD_EMPTY', message: 'No pipe/fitting segments available for guided-cantilever calculation.' }],
        payload,
      };
    }
    const result = solveGC3D(payload);
    const rawStatus = result?.status || result?.results?.status || 'PASSED';
    const normalizedStatus = rawStatus === 'PASSED' ? 'PASSED' : 'NOT_QUALIFIED';
    return {
      status: normalizedStatus,
      diagnostics: normalizedStatus === 'PASSED' ? [] : (result?.diagnostics || [{ severity: 'error', code: 'GC3D_NOT_QUALIFIED', message: `GC3D returned status ${rawStatus}.` }]),
      payload,
      result,
    };
  } catch (error) {
    return {
      status: 'NOT_QUALIFIED',
      diagnostics: [{ severity: 'error', code: 'GC3D_RUN_FAILED', message: error?.message || 'GC3D run failed.' }],
      result: null,
    };
  }
}

export function run3DSimplifiedCalculationSuite(model = {}, params = {}) {
  const supportLoads = solveSupportLoads3D(model);
  const forceActions = solve3DForceActions(model, { supportLoadResult: supportLoads });
  const guidedCantileverThermal = runGuidedCantileverFromCalculationModel(model, params);

  const diagnostics = [
    ...(supportLoads.diagnostics || []),
    ...(forceActions.diagnostics || []),
    ...(guidedCantileverThermal.diagnostics || []),
  ];

  const errorCount = diagnostics.filter((item) => String(item.severity || '').toLowerCase() === 'error').length;
  const warningCount = diagnostics.filter((item) => ['warn', 'warning'].includes(String(item.severity || '').toLowerCase())).length;

  return {
    schemaVersion: SIMPLIFIED_3D_SUITE_SCHEMA_VERSION,
    status: errorCount ? 'NOT_QUALIFIED' : warningCount ? 'PASSED_WITH_WARNINGS' : 'PASSED',
    diagnostics,
    results: {
      supportLoads,
      forceActions,
      guidedCantileverThermal,
    },
  };
}
