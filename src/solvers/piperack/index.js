import { solvePipeRack as _solvePipeRackLoop } from '../../core/solvers/piperack/solvePipeRack.js';
import { solveRackLayout as _solveRackLayout } from '../../core/solvers/piperack/solveRackLayout.js';

export { solvePipeRack as solvePipeRackLoop } from '../../core/solvers/piperack/solvePipeRack.js';
export { solveRackLayout } from '../../core/solvers/piperack/solveRackLayout.js';
export { solveRackLoopOrder } from '../../core/solvers/piperack/solveRackLoopOrder.js';

export function runPipeRackScreening(inputs = {}) {
  const { lines = [], globalSettings = {}, methodology = 'FLUOR', globalInputs = {} } = inputs;
  const loopResult = _solvePipeRackLoop(lines, globalSettings, methodology, globalInputs);
  const layoutResult = _solveRackLayout(lines, globalSettings);
  return {
    moduleId: 'piperack-expansion-loop',
    engineeringLevel: 'DESIGN_AID_SCREENING',
    methodId: loopResult.methodId,
    formulaIds: loopResult.formulaIds,
    status: loopResult.status,
    inputs,
    formulas: ['L_req_ft = sqrt(3 * E * OD * delta / (144 * S_allow))'],
    assumptions: loopResult.assumptions || [],
    results: { loop: loopResult, layout: layoutResult },
    warnings: [...(loopResult.warnings || []), ...(layoutResult.warnings || [])],
    diagnostics: loopResult.diagnostics || [],
    layoutHints: layoutResult.summary || {}
  };
}

export function runPipeRackLoopOrderBenchmark(inputs = {}) {
  const { lines = [], globalSettings = {}, methodology = 'FLUOR', globalInputs = {} } = inputs;
  return _solvePipeRackLoop(lines, globalSettings, methodology, globalInputs);
}

export function runPipeRackLineBenchmark(inputs = {}) {
  const result = runPipeRackLoopOrderBenchmark(inputs);
  const targetLineId = inputs.targetLineId;
  const line = result.lineResults.find((item) => item.lineId === targetLineId) || result.lineResults[0] || {};
  return {
    moduleId: 'piperack-expansion-loop',
    methodId: result.methodId,
    formulaIds: result.formulaIds,
    status: result.status,
    ...line
  };
}

export function runPipeRackBundleBenchmark(inputs = {}) {
  return runPipeRackLineBenchmark({ ...inputs, methodology: '2D_BUNDLE' });
}

export function runPipeRackMistBenchmark(inputs = {}) {
  const result = _solvePipeRackLoop(inputs.lines || [], inputs.globalSettings || {}, inputs.methodology || 'FLUOR', inputs.globalInputs || {});
  const mistLine = result.lines.find((line) => line.mistResult || line.status === 'NOT_QUALIFIED') || result.lines[0] || {};
  const mistResult = mistLine.mistResult || { status: result.status, isQualified: result.isQualified === true };
  return {
    moduleId: 'piperack-expansion-loop',
    methodId: 'MIST_NOZZLE_SCREENING',
    formulaIds: ['MIST_VENDOR_LOAD_SCREENING'],
    status: mistResult.status || result.status,
    isQualified: Boolean(mistResult.isQualified),
    diagnostics: mistResult.diagnostics || result.diagnostics || []
  };
}
