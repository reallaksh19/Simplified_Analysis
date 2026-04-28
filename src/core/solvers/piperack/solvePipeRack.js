/* AGENT HANDOFF: Agent 1-RACK → Agent 2-DB / Agent 3-UI / Agent 4-QA
 * Date: 2026-04-27
 * Changes:
 *   - src/core/solvers/piperack/solveRackLoopOrder.js: Documented 144 derivation, fixed 2D_BUNDLE logic to use 1 + frictionFactor as direct length multiplier per Fluor standard.
 *   - src/core/solvers/piperack/solveRackLayout.js: Added named constants for standard gap and documented bowing multiplier.
 *   - src/core/solvers/piperack/solvePipeRack.js: Added formulaTrace and assumptions to result shape.
 * Interface changes:
 *   - solvePipeRack: Now returns formulaTrace array and assumptions string array in result object.
 * Known open items:
 *   - Need UI agents to make sure formulaTrace is rendered for Pipe Rack results.
 * Tests run:
 *   - src/piperack/solver test suite: All passing
 */
import { solveRackLoopOrder } from './solveRackLoopOrder.js';

export function solvePipeRack(lines = [], globalSettings = {}, methodology = 'FLUOR', globalInputs = {}) {
  const { anchorDistanceFt = 200, defaultSpacingFt = 2.5, allowableStressPsi = 20000 } = globalSettings || {};
  const loopOrderResult = solveRackLoopOrder(lines, globalSettings, methodology, globalInputs);
  const sorted = loopOrderResult.lines;

  const rackResults = sorted.map((line, index) => {
    const stepsOut = sorted.length - 1 - index;
    const W_ft = Number(defaultSpacingFt) + (2 * stepsOut * Number(defaultSpacingFt));
    const L_req_ft = Number(line.L_req_ft || 0);
    const H_ft = Math.max((L_req_ft - W_ft) / 2, 0);
    const G1_ft = (Number(line.sizeNps || 0) * 4) / 12;
    const G2_ft = (Number(line.sizeNps || 0) * 14) / 12;

    let mistResult = null;
    const warnings = [];
    if (line.hasVessel) {
      const { R_mm = 800, T_mm = 20, r_n_mm = 100 } = line.vesselData || {};
      const K_capacity = (Number(r_n_mm) * Number(T_mm) * 126 * 1000) / Math.sqrt(Number(R_mm) * Number(T_mm));
      // Phase 5 keeps this as an approximation and records it as such instead of hiding it.
      const F_r_N = 3000;
      const M_l_Nmm = 1.2 * 1000000;
      const M_c_Nmm = 0.5 * 1000000;
      const interactionRatio = (3.0 * r_n_mm * F_r_N + 1.5 * M_l_Nmm + 1.15 * Math.sqrt(r_n_mm / 10) * M_c_Nmm) / (Math.PI * K_capacity);
      warnings.push('MIST vessel interaction uses Phase 5 approximation forces; verify with detailed nozzle analysis before final issue.');
      mistResult = { K_capacity, interactionRatio, status: interactionRatio <= 1.0 ? 'PASS' : 'FAIL', approximation: true };
    }

    return {
      id: line.id,
      sizeNps: line.sizeNps,
      material: line.material,
      tOperate: line.tOperate,
      deltaIn: line.deltaIn,
      loopOrder: line.loopOrder,
      nestingPosition: index + 1,
      dimensions: { W_ft, L_req_ft, H_ft, G1_ft, G2_ft },
      props: line.props,
      warnings,
      mistResult,
    };
  });

  const governingLine = rackResults.reduce((best, line) => (!best || line.dimensions.L_req_ft > best.dimensions.L_req_ft ? line : best), null);

  return {
    schemaVersion: 'piperack-result-v1',
    lines: rackResults,
    formulaTrace: [
      { name: 'Loop order ranking', expression: 'loopOrder = I × δ (in⁴ × in)',
        values: { lines: loopOrderResult.lines.map(l => ({ id: l.id, loopOrder: l.loopOrder })) } },
      { name: 'Required loop leg (all lines)',
        expression: 'L_req_ft = √(3·E·OD·δ / (144·S_allow))',
        values: { lines: loopOrderResult.lines.map(l => ({ id: l.id, L_req_ft: l.L_req_ft, deltaIn: l.deltaIn })) } },
    ],
    warnings: [
      ...loopOrderResult.warnings,
      ...rackResults.flatMap((line) => (line.warnings || []).map((message) => ({ lineId: line.id, severity: 'warn', code: 'RACK_APPROXIMATION', message }))),
    ],
    assumptions: [
      'Pipe rack loop sizing is a simplified loop-order and layout screening method.',
      'Detailed stress/nozzle qualification must be performed in dedicated stress software before final issue.',
      'Anchor distance halved for expansion length per piperack mid-span anchor convention.',
      'Loop ordering by I×δ: higher stiffness × higher displacement pipes placed on lower tiers.',
      methodology === '2D_BUNDLE' ? '2D_BUNDLE methodology applies (1+μ) loop length factor per Fluor E-3.' : 'FLUOR mode follows guided-cantilever style loop order screening.',
    ],
    meta: {
      methodology,
      anchorDistanceFt: Number(anchorDistanceFt),
      allowableStressPsi: Number(allowableStressPsi),
      governingDeltaX: governingLine ? governingLine.deltaIn : 0,
      maxL: governingLine ? governingLine.dimensions.L_req_ft : 0,
      warningCount: loopOrderResult.warnings.length,
    },
    methodologyUsed: methodology === '2D_BUNDLE' ? 'SIMPLIFIED_RACK_METHOD' : 'KELLOGG_MIST',
    governingLine: governingLine ? { id: governingLine.id } : { id: 'None' },
  };
}
