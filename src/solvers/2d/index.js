import { normalizeInput } from './normalizeInput.js';
import {
  calcCantileverEndLoad,
  calcSimpleSpanDistributedLoad,
  calcGuidedCantileverThermal,
  calcSimpleSpanConcentratedLoad,
  calcSimpleSpanPointLoad
} from './math2d.js';

export function run2DSolver(payload) {
  const { geometry, calculationType = "CANTILEVER_END_LOAD", inputs = {} } = payload;

  const { normalizedGeometry, diagnostics, warnings } = normalizeInput(geometry);

  const results = {};
  const formulas = [];
  const assumptions = [
    "2D module is a Screening-level calculation only. Not for final code compliance.",
    "Formulas use basic deterministic cantilever and simple span equations."
  ];

  if (normalizedGeometry?.segments?.length > 1) {
    diagnostics.push({ severity: "WARNING", code: "SCREENING_ONLY_MULTI_SEGMENT", message: "Multiple segments detected; 2D direct solver is screening-only for this geometry." });
  }

  if (diagnostics.some(d => d.severity === "ERROR" || d.severity === "FATAL")) {
    return {
      moduleId: "2d-simplified-stress-check",
      engineeringLevel: "SCREENING",
      inputs: payload,
      formulas: [],
      assumptions,
      results: {},
      warnings,
      diagnostics
    };
  }

  let calcRes = {};
  const segment = normalizedGeometry.segments[0];
  if (!segment) {
    diagnostics.push({ severity: "ERROR", message: "No valid segment found for calculation." });
  } else {
    const { length, od, I, Z, E } = segment;

    // Screening Limits
    if (length > 1200) { // arbitrary 100 ft limit warning
      warnings.push({ code: "SPAN_OUT_OF_BOUNDS", severity: "WARNING", message: "Span length exceeds typical screening limits." });
    }

    switch (calculationType) {
      case "CANTILEVER_END_LOAD":
        calcRes = calcCantileverEndLoad({ P: inputs.P || 0, L: length, E, I, Z });
        break;
      case "SIMPLE_SPAN_DISTRIBUTED":
        calcRes = calcSimpleSpanDistributedLoad({ w: inputs.w || 0, L: length, E, I, Z });
        break;
      case "GUIDED_CANTILEVER_THERMAL":
        calcRes = calcGuidedCantileverThermal({ deltaX: inputs.deltaX || 0, L: length, E, I, OD: od });
        break;
      case "SIMPLE_SPAN_CONCENTRATED":
        calcRes = calcSimpleSpanPointLoad({ P: inputs.P || 0, L: length, a: inputs.a || (length / 2), E, I, Z });
        break;
      default:
        diagnostics.push({ severity: "ERROR", message: `Unknown calculation type: ${calculationType}` });
    }

    if (calcRes.error) {
      diagnostics.push({ severity: "ERROR", message: calcRes.error });
    } else if (calcRes.formulas) {
      formulas.push(...calcRes.formulas);
      // Construct result with units
      results.moment = { value: calcRes.moment, unit: "in-lbf" };
      results.stress = { value: calcRes.stress, unit: "psi" };
      if (calcRes.delta !== undefined) results.delta = { value: calcRes.delta, unit: "in" };
      if (calcRes.force !== undefined) results.force = { value: calcRes.force, unit: "lbf" };
    }
  }

  return {
    moduleId: "2d-simplified-stress-check",
    methodId: calcRes.methodId || calculationType,
    formulaIds: calcRes.formulaIds || [],
    unitSystem: calcRes.unitSystem || { length: "in", force: "lbf", stress: "psi", moment: "in-lbf" },
    status: diagnostics.some(d => d.severity === "WARNING" && d.code === "SCREENING_ONLY_MULTI_SEGMENT") ? "SCREENING_ONLY" : (diagnostics.some(d => d.severity === "ERROR" || d.severity === "FATAL") ? "FAILED" : "PASSED"),
    engineeringLevel: "SCREENING",
    inputs: payload,
    formulas,
    assumptions,
    results,
    warnings,
    diagnostics
  };
}
