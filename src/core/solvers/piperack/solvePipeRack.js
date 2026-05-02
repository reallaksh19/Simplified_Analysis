import { solveRackLoopOrder } from './solveRackLoopOrder.js';

const METHOD_ID = 'PIPERACK_LOOP_ORDER';
const FORMULA_ID = 'PIPERACK_LOOP_REQUIRED_LEG';

const statusRank = {
  PASSED: 0,
  SCREENING_ONLY: 1,
  NOT_QUALIFIED: 2,
  MISSING_DATA: 3,
  FAILED: 4,
  ERROR: 5
};

const worstStatus = (...statuses) => statuses.reduce((worst, item) => (
  (statusRank[item] ?? 0) > (statusRank[worst] ?? 0) ? item : worst
), 'PASSED');

function evaluateMist(line) {
  if (!line.hasVessel && !line.requiresMistCheck) return null;
  const vendorLoads = line.vendorLoads || line.nozzleLoads;
  const allowables = line.nozzleAllowables || line.vendorAllowables;
  if (!vendorLoads || !allowables) {
    return {
      methodId: 'MIST_NOZZLE_SCREENING',
      formulaIds: ['MIST_VENDOR_LOAD_SCREENING'],
      status: 'NOT_QUALIFIED',
      isQualified: false,
      diagnostics: [{ severity: 'ERROR', code: 'MIST_VENDOR_LOADS_MISSING', message: `Line ${line.id}: vessel/vendor nozzle loads or allowables are absent; clean PASS/FAIL is blocked.` }]
    };
  }
  const radialRatio = Math.abs(Number(vendorLoads.radialForceN || 0)) / Math.max(Math.abs(Number(allowables.radialForceN || 0)), 1);
  const momentRatio = Math.abs(Number(vendorLoads.momentNmm || 0)) / Math.max(Math.abs(Number(allowables.momentNmm || 0)), 1);
  const interactionRatio = radialRatio + momentRatio;
  return {
    methodId: 'MIST_NOZZLE_SCREENING',
    formulaIds: ['MIST_VENDOR_LOAD_SCREENING'],
    status: interactionRatio <= 1 ? 'PASSED' : 'FAILED',
    isQualified: interactionRatio <= 1,
    interactionRatio,
    diagnostics: []
  };
}

export function solvePipeRack(lines = [], globalSettings = {}, methodology = 'FLUOR', globalInputs = {}) {
  const loopOrderResult = solveRackLoopOrder(lines, globalSettings, methodology, globalInputs);
  const sorted = loopOrderResult.lines;
  const spacingSource = globalSettings.defaultSpacingSource || globalSettings.constantsSource || globalInputs.defaultSpacingSource || globalInputs.constantsSource || 'hardcoded-default';
  const defaultSpacingFt = Number(globalSettings.defaultSpacingFt ?? globalInputs.defaultSpacingFt ?? 2.5);
  const diagnostics = [...(loopOrderResult.diagnostics || [])];
  const spacingStatus = spacingSource === 'hardcoded-default' ? 'SCREENING_ONLY' : 'PASSED';
  if (spacingSource === 'hardcoded-default') {
    diagnostics.push({ severity: 'WARNING', code: 'RACK_SPACING_HARDCODED', message: 'Pipe rack defaultSpacingFt used hardcoded fallback value 2.5 ft; supply settings/defaults or benchmark fixture input for qualified status.' });
  }

  const rackResults = sorted.map((line, index) => {
    const stepsOut = sorted.length - 1 - index;
    const W_ft = defaultSpacingFt + (2 * stepsOut * defaultSpacingFt);
    const L_req_ft = Number(line.L_req_ft || 0);
    const H_ft = Math.max((L_req_ft - W_ft) / 2, 0);
    const G1_ft = (Number(line.sizeNps || 0) * 4) / 12;
    const G2_ft = (Number(line.sizeNps || 0) * 14) / 12;
    const mistResult = evaluateMist(line);
    if (mistResult?.diagnostics?.length) diagnostics.push(...mistResult.diagnostics);

    return {
      id: line.id,
      lineId: line.id,
      sizeNps: line.sizeNps,
      NPS: line.sizeNps,
      schedule: line.schedule || '40',
      material: line.material,
      tOperate: line.tOperate,
      delta: line.deltaIn,
      deltaIn: line.deltaIn,
      loopOrder: line.loopOrder,
      L_req_ft,
      methodId: METHOD_ID,
      formulaId: FORMULA_ID,
      formulaIds: [FORMULA_ID],
      unitSystem: 'imperial',
      status: worstStatus(line.status, spacingStatus, mistResult?.status || 'PASSED'),
      isQualified: line.status === 'PASSED' && spacingStatus === 'PASSED' && (!mistResult || mistResult.isQualified),
      nestingPosition: index + 1,
      dimensions: { W_ft, L_req_ft, H_ft, G1_ft, G2_ft },
      props: line.props,
      mistResult,
      diagnostics: mistResult?.diagnostics || []
    };
  });

  const overallStatus = worstStatus(loopOrderResult.status, spacingStatus, ...rackResults.map((line) => line.status));
  const governingLine = rackResults.reduce((best, line) => (!best || line.dimensions.L_req_ft > best.dimensions.L_req_ft ? line : best), null);

  return {
    schemaVersion: 'piperack-result-v2',
    moduleId: 'piperack-expansion-loop',
    methodId: METHOD_ID,
    formulaIds: [FORMULA_ID],
    status: overallStatus,
    isQualified: overallStatus === 'PASSED',
    sortedLineIds: loopOrderResult.sortedLineIds,
    lineResults: rackResults.map((line) => ({
      lineId: line.id,
      NPS: line.NPS,
      schedule: line.schedule,
      material: line.material,
      delta: line.delta,
      loopOrder: line.loopOrder,
      L_req_ft: line.L_req_ft,
      methodId: line.methodId,
      formulaId: line.formulaId,
      formulaIds: line.formulaIds,
      unitSystem: line.unitSystem,
      status: line.status
    })),
    lines: rackResults,
    formulaTrace: [
      { id: FORMULA_ID, name: 'Required loop leg', expression: 'L_req_ft = sqrt(3 * E * OD * delta / (144 * S_allow))', values: { lines: loopOrderResult.lineResults } }
    ],
    warnings: [...(loopOrderResult.warnings || [])],
    diagnostics,
    assumptions: [
      'Pipe rack loop sizing is a simplified loop-order and layout screening method.',
      'Detailed stress/nozzle qualification must be performed in dedicated stress software before final issue.',
      'Loop ordering by I×δ: higher stiffness × higher displacement pipes placed on lower tiers.'
    ],
    meta: {
      methodology,
      anchorDistanceFt: Number(globalSettings.anchorDistanceFt ?? 200),
      allowableStressPsi: Number(globalSettings.allowableStressPsi ?? 20000),
      defaultSpacingFt,
      defaultSpacingSource: spacingSource,
      governingDeltaX: governingLine ? governingLine.delta : 0,
      maxL: governingLine ? governingLine.dimensions.L_req_ft : 0,
      warningCount: (loopOrderResult.warnings || []).length,
      diagnosticCount: diagnostics.length
    },
    methodologyUsed: methodology === '2D_BUNDLE' ? 'SIMPLIFIED_RACK_METHOD' : 'KELLOGG_MIST',
    governingLine: governingLine ? { id: governingLine.id } : { id: 'None' }
  };
}
