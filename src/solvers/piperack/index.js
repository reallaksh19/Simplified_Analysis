import { solvePipeRack as _solvePipeRackLoop } from '../../core/solvers/piperack/solvePipeRack.js';
import { solveRackLayout as _solveRackLayout } from '../../core/solvers/piperack/solveRackLayout.js';

export { solvePipeRack as solvePipeRackLoop } from '../../core/solvers/piperack/solvePipeRack.js';
export { solveRackLayout } from '../../core/solvers/piperack/solveRackLayout.js';

export function runPipeRackScreening(inputs) {
  const { lines = [], globalSettings = {}, methodology = 'FLUOR', globalInputs = {} } = inputs;
  const loopResult = _solvePipeRackLoop(lines, globalSettings, methodology, globalInputs);
  const layoutResult = _solveRackLayout(lines, globalSettings);

  const warnings = [];
  if (!globalSettings?.anchorDistanceFt || !globalSettings?.temperatureDelta) {
    warnings.push({ severity: 'warn', code: 'MISSING_TEMP_DELTA', message: 'Missing temperature delta or anchor distance for expansion screening.' });
  }

  lines.forEach(line => {
    if (!line.material) warnings.push({ severity: 'warn', code: 'MISSING_MATERIAL', message: `Line ${line.id} missing material.` });
    if (!line.sizeNps) warnings.push({ severity: 'warn', code: 'MISSING_SIZE', message: `Line ${line.id} missing pipe size.` });

    // Add expansion coefficient warning
    if (line.material && !line.props?.expansionCoefficient) {
       warnings.push({ severity: 'warn', code: 'MISSING_MATERIAL_EXPANSION_COEFFICIENT', message: `Line ${line.id} missing material expansion coefficient.` });
    }

    // Add loop geometry not enough warning (example criteria: loop not required but thermal expansion is high, or simple flag)
    if (!line.dimensions?.W_ft && line.deltaIn > 2) {
       warnings.push({ severity: 'warn', code: 'LOOP_GEOMETRY_INSUFFICIENT', message: `Line ${line.id} loop geometry not enough for expected thermal expansion.` });
    }

    // Check span outside screening limits (example criteria)
    if (line.L_req_ft > 150) {
      warnings.push({ severity: 'warn', code: 'SPAN_OUTSIDE_LIMITS', message: `Line ${line.id} span exceeds simplified screening limits (150ft).` });
    }

    // Warn user to perform formal stress analysis
    warnings.push({ severity: 'info', code: 'FORMAL_STRESS_REQUIRED', message: `Line ${line.id}: User should perform formal stress analysis for final approval.` });
  });

  return {
    moduleId: "piperack-expansion-loop",
    engineeringLevel: "DESIGN_AID_SCREENING",
    inputs,
    formulas: ["Loop order based on guided cantilever / expansion length"],
    assumptions: loopResult.assumptions || [],
    results: {
      loop: loopResult,
      layout: layoutResult
    },
    warnings: [...warnings, ...(loopResult.warnings || []), ...(layoutResult.warnings || [])],
    diagnostics: [],
    layoutHints: layoutResult.summary || {}
  };
}
