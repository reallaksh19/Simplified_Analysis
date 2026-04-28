import { sectionProperties, thermalDisplacement, gcBasic, gcWithFlexibility, combineStressAtNode, allowableStress, stressCheck, intensifiedStress } from '../../core/solvers/gc3d/GC3DCalcEngine.js';

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
/* AGENT HANDOFF: Agent 1-GC3D -> Agent 4-QA (or orchestrator)
 * Date: 2026-04-27
 * Changes:
 *   - src/solvers/3d/solveGC3D.js: Fixed double SRSS combination issue. SRSS is now performed only at the node level. Added formulaTrace output.
 * Interface changes:
 *   - Output results shape correctly conforms to canonical shape.
 * Known open items:
 *   - Issue G-3 (per-node displacement routing) is pending.
 * Tests run:
 *   - npx jest src/3d-analysis/GC3DSolver.test.js: Passed 3/3
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
    const perAxisSE = {}; // { X: SE_x, Y: SE_y, Z: SE_z }
    let totalF = 0;
    let totalM = 0;

    // Per-node displacement routing
    const getLocalDisplacements = (segmentId) => {
        // Simple heuristic: walk back from segment start node to an anchor to find
        // accumulating lengths. In a real generalized system, we'd build an adjacency graph
        // and find the sum of all segments from the nearest anchor up to this node.
        const totalRuns = { X: 0, Y: 0, Z: 0 };
        // For simplicity in this bounded screening tool, we'll continue the assumption
        // that all parallel runs contribute to the displacement. In a more rigorous
        // graph solver, this would map the path from Anchor to current node.
        segments.forEach((s) => {
            const len = Number.parseFloat(s.length_in);
            if (!Number.isNaN(len)) {
                if (s.axis === 'X') totalRuns.X += len;
                if (s.axis === 'Y') totalRuns.Y += len;
                if (s.axis === 'Z') totalRuns.Z += len;
            }
        });

        return {
            X: thermalDisplacement(alpha, totalRuns.X, deltaT),
            Y: thermalDisplacement(alpha, totalRuns.Y, deltaT),
            Z: thermalDisplacement(alpha, totalRuns.Z, deltaT),
        };
    };

    const deltas = getLocalDisplacements(seg.id);
    // In full implementation, deltas would be distinct per-leg depending on distance from anchor.

    perpAxes.forEach((axis) => {
      const displacement = deltas[axis];
      if (displacement <= 0) return;

      const result = (k > 1.0 && R_e > 0)
        ? gcWithFlexibility(E, I, Z, D_o, displacement, L_in, k, R_e)
        : gcBasic(E, I, Z, D_o, displacement, L_in);

      // Apply SIF to single-direction bending moment result (ASME B31.3 App D):
      const SE_axis = includeSIF ? intensifiedStress(i_i, result.M_inlbf, Z) : result.Sb_psi;
      perAxisSE[axis] = SE_axis;
      totalF += result.F_lbf;
      totalM += result.M_inlbf;
    });

    legResults.push({
      legId: seg.id, axis: seg.axis, L_in,
      F_lbf: totalF, M_inlbf: totalM,
      perAxisSE,           // { X, Y, Z } — individual direction expansion stresses
      k, i_i, R_e
    });

    formulaTrace.push({
      name: `Leg ${seg.id} (${seg.axis}-axis) bending stress`,
      expression: includeSIF
        ? 'SE = i_i × M / Z  [ASME B31.3 §319.4.4]'
        : 'Sb = M / Z = 3·E·D_o·δ / L²',
      values: {
        L_in, D_o, t_n: seg.wt_in,
        I_in4: I, Z_in3: Z,
        k, i_i, R_e_in: R_e,
        perpendicular_displacements: perAxisSE,
        totalForce_lbf: totalF,
        totalMoment_inlbf: totalM,
      }
    });

    log(5, `Leg ${seg.id}: F=${totalF.toFixed(0)}lbf, M=${totalM.toFixed(0)}in-lbf`);
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

    // Collect all non-zero per-axis SE values across all connected legs at this node:
    const allSE = connectedLegs.flatMap((leg) => Object.values(leg.perAxisSE || {})).filter(v => v > 0);
    const SE_node = combineStressAtNode(allSE);  // single SRSS — correct
    const { ratio, result } = stressCheck(SE_node, SA);

    if (ratio > maxRatio) {
      maxRatio = ratio;
      critical = nodeId;
    }
    if (result === 'FAIL') overallResult = 'FAIL';

    nodeResults.push({ nodeId, SE_psi: SE_node, SA_psi: SA, ratio, result, perAxisSE: connectedLegs.length > 0 ? connectedLegs.reduce((acc, leg) => ({...acc, ...leg.perAxisSE}), {}) : {} });
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
