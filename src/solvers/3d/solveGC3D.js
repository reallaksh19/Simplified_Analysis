import { sectionProperties, thermalDisplacement, gcBasic, gcWithFlexibility, combineStressAtNode, allowableStress, stressCheck } from '../../core/solvers/gc3d/GC3DCalcEngine.js';

const makeLog = (debugLog) => (step, msg) => {
  const sequence = debugLog.length;
  debugLog.push({ step, msg, sequence, timestamp: `gc3d-${String(sequence).padStart(3, '0')}` });
};

/**
 * Deterministic pure function to solve Guided Cantilever 3D Piping Analysis.
 * UI state, timestamps, and random numbers are intentionally excluded from the
 * calculation payload so snapshots can be compared byte-for-byte.
 *
 * @param {Object} payload Strict JSON input payload.
 * @param {Object} payload.nodes `{ [id]: { pos: [x,y,z], type: 'free'|'anchor'|'elbow'|'tee' } }`
 * @param {Array} payload.segments `[{ id, startNode, endNode, length_in, od_in, wt_in, axis, compType }]`
 * @param {Object} payload.params `{ deltaT_F, E_psi, alpha_in_in_F, Sc_psi, Sh_psi, f, Sa_psi }`
 * @param {Object} payload.fittingData `{ [segId]: { k, i_i, R_e } }`
 * @param {boolean} payload.includeSIF
 * @returns {Object} `{ legResults, nodeResults, criticalNode, overallResult, debugLog, formulaTrace, warnings }`
 */
export function solveGC3D(payload) {
  const { nodes, segments, params, fittingData = {}, includeSIF = true } = payload || {};
  const debugLog = [];
  const formulaTrace = [];
  const warnings = [];
  const diagnostics = [];
  const assumptions = [
    'System behaves as guided cantilevers',
    'Bending stresses dominate',
    'Thermal expansion is primary load'
  ];
  const log = makeLog(debugLog);

  log(0, 'Starting deterministic GC3D guided-cantilever analysis.');

  if (!nodes || Object.keys(nodes).length < 2 || !Array.isArray(segments) || segments.length === 0) {
    warnings.push('Need >=2 nodes and >=1 segment.');
    diagnostics.push({ severity: 'FATAL', message: 'Insufficient geometry.'});
    log(1, 'Validation failed: Need >=2 nodes and >=1 segment.');
    return {
        moduleId: "3d-guided-cantilever",
        engineeringLevel: "SCREENING",
        inputs: payload,
        formulas: formulaTrace,
        assumptions,
        results: { legResults: [], nodeResults: [], criticalNode: null, overallResult: 'FAIL', debugLog },
        warnings,
        diagnostics,
        visualizationHints: {}
    };
  }

  const E = Number.parseFloat(params?.E_psi);
  const alpha = Number.parseFloat(params?.alpha_in_in_F);
  const deltaT = Number.parseFloat(params?.deltaT_F);
  const fFactor = Number.parseFloat(params?.f);
  const Sc = Number.parseFloat(params?.Sc_psi);
  const Sh = Number.parseFloat(params?.Sh_psi);

  if ([E, alpha, deltaT, fFactor, Sc, Sh].some((value) => Number.isNaN(value))) {
    warnings.push('Critical GC3D parameters contain NaN.');
    diagnostics.push({ severity: 'ERROR', message: 'Missing material or temperature properties.'});
    log(1, 'Validation failed: Critical parameters are NaN.');
    return {
        moduleId: "3d-guided-cantilever",
        engineeringLevel: "SCREENING",
        inputs: payload,
        formulas: formulaTrace,
        assumptions,
        results: { legResults: [], nodeResults: [], criticalNode: null, overallResult: 'FAIL', debugLog },
        warnings,
        diagnostics,
        visualizationHints: {}
    };
  }

  const SA = allowableStress(fFactor, Sc, Sh);
  formulaTrace.push({ name: 'Allowable expansion stress range', expression: 'SA = f(1.25Sc + 0.25Sh)', values: { f: fFactor, Sc_psi: Sc, Sh_psi: Sh, SA_psi: SA } });
  log(1, `Validated parameters. E=${E}, alpha=${alpha}, dT=${deltaT}, SA=${SA}`);

  const totalRuns = { X: 0, Y: 0, Z: 0 };
  segments.forEach((seg) => {
    const len = Number.parseFloat(seg.length_in);
    if (!Number.isNaN(len)) {
      if (seg.axis === 'X') totalRuns.X += len;
      if (seg.axis === 'Y') totalRuns.Y += len;
      if (seg.axis === 'Z') totalRuns.Z += len;
    }
  });

  const deltas = {
    X: thermalDisplacement(alpha, totalRuns.X, deltaT),
    Y: thermalDisplacement(alpha, totalRuns.Y, deltaT),
    Z: thermalDisplacement(alpha, totalRuns.Z, deltaT),
  };
  formulaTrace.push({ name: 'Thermal displacement by run axis', expression: 'delta = alpha * L * deltaT', values: { alpha, deltaT, totalRuns, deltas } });
  log(4, `Thermal displacements (in): dX=${deltas.X.toFixed(4)}, dY=${deltas.Y.toFixed(4)}, dZ=${deltas.Z.toFixed(4)}`);

  const legResults = [];
  segments.forEach((seg) => {
    const L_in = Number.parseFloat(seg.length_in);
    const D_o = Number.parseFloat(seg.od_in);
    const t_n = Number.parseFloat(seg.wt_in);

    if (Number.isNaN(L_in) || Number.isNaN(D_o) || Number.isNaN(t_n) || L_in <= 0) {
      warnings.push(`Segment ${seg.id} has invalid dimensions.`);
      legResults.push({ legId: seg.id, axis: seg.axis, L_in, F_lbf: 0, M_inlbf: 0, Sb_psi: 0, error: 'Invalid Dimensions' });
      return;
    }

    const { I, Z } = sectionProperties(D_o, t_n);
    const data = fittingData[seg.id] || { k: 1.0, i_i: 1.0, R_e: 0 };
    const k = includeSIF ? Number.parseFloat(data.k || 1.0) : 1.0;
    const i_i = includeSIF ? Number.parseFloat(data.i_i || 1.0) : 1.0;
    const R_e = Number.parseFloat(data.R_e || 0);

    const perpAxes = ['X', 'Y', 'Z'].filter((axis) => axis !== seg.axis);
    const Sb_components = [];
    let totalF = 0;
    let totalM = 0;

    perpAxes.forEach((axis) => {
      const displacement = deltas[axis];
      if (displacement <= 0) return;

      const result = (k > 1.0 && R_e > 0)
        ? gcWithFlexibility(E, I, Z, D_o, displacement, L_in, k, R_e)
        : gcBasic(E, I, Z, D_o, displacement, L_in);

      const SE = i_i * result.Sb_psi;
      Sb_components.push(SE);
      totalF += result.F_lbf;
      totalM += result.M_inlbf;
    });

    const Sb_combined = combineStressAtNode(Sb_components);
    legResults.push({ legId: seg.id, axis: seg.axis, L_in, F_lbf: totalF, M_inlbf: totalM, Sb_psi: Sb_combined, k, i_i, R_e });
    log(5, `Leg ${seg.id}: F=${totalF.toFixed(0)}lbf, M=${totalM.toFixed(0)}in-lbf, Sb_combined=${Sb_combined.toFixed(0)}psi`);
  });

  const nodeResults = [];
  let critical = null;
  let maxRatio = 0;
  let overallResult = 'PASS';

  let hasAnchors = false;
  let hasSupports = false;

  Object.keys(nodes).forEach((nodeId) => {
    const node = nodes[nodeId];
    if (node.type === 'anchor') hasAnchors = true;
    if (node.type === 'support') hasSupports = true;

    const connectedLegs = legResults.filter((leg) => {
      const legSeg = segments.find((seg) => seg.id === leg.legId);
      return legSeg && (legSeg.startNode === nodeId || legSeg.endNode === nodeId);
    });

    const combined = combineStressAtNode(connectedLegs.map((leg) => leg.Sb_psi || 0));
    const { ratio, result } = stressCheck(combined, SA);

    if (ratio > maxRatio) {
      maxRatio = ratio;
      critical = nodeId;
    }
    if (result === 'FAIL') overallResult = 'FAIL';

    nodeResults.push({ nodeId, SE_psi: combined, SA_psi: SA, ratio, result });
  });

  if (!hasAnchors) warnings.push('Missing anchor nodes in geometry.');
  if (!hasSupports) warnings.push('Missing support nodes in geometry.');

  const branchNodes = Object.values(nodes).filter(n => n.type === 'tee');
  if (branchNodes.length > 0) warnings.push('unsupported branch complexity');

  if (segments.some(seg => ['BEND', 'VALVE', 'FLANGE'].includes(seg.compType))) {
    warnings.push('out-of-scope geometry');
  }

  formulaTrace.push({ name: 'Node stress combination', expression: 'Snode = sqrt(sum(Sb_i^2))', values: { criticalNode: critical, maxRatio } });
  log(7, `RESULT: ${overallResult}. Critical Node: ${critical} (ratio=${maxRatio.toFixed(3)})`);

  return {
    moduleId: "3d-guided-cantilever",
    engineeringLevel: "SCREENING",
    inputs: payload,
    formulas: formulaTrace,
    assumptions,
    results: { legResults, nodeResults, criticalNode: critical, overallResult, debugLog },
    warnings,
    diagnostics,
    visualizationHints: { criticalNode: critical }
  };
}
