import { normalizeInput } from './normalizeInput.js';
import {
  calcCantileverEndLoad,
  calcSimpleSpanDistributedLoad,
  calcGuidedCantileverThermal,
  calcSimpleSpanConcentratedLoad
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

  const segment = normalizedGeometry.segments[0];
  if (!segment) {
    diagnostics.push({ severity: "ERROR", message: "No valid segment found for calculation." });
  } else {
    const { length, od, I, Z, E } = segment;

    // Screening Limits
    if (length > 1200) { // arbitrary 100 ft limit warning
      warnings.push({ code: "SPAN_OUT_OF_BOUNDS", severity: "WARNING", message: "Span length exceeds typical screening limits." });
    }

    let calcRes = {};

    switch (calculationType) {
      case "CANTILEVER_END_LOAD":
        calcRes = calcCantileverEndLoad(inputs.P || 0, length, E, I, Z);
        break;
      case "SIMPLE_SPAN_DISTRIBUTED":
        calcRes = calcSimpleSpanDistributedLoad(inputs.w || 0, length, E, I, Z);
        break;
      case "GUIDED_CANTILEVER_THERMAL":
        calcRes = calcGuidedCantileverThermal(inputs.deltaX || 0, length, E, I, od);
        break;
      case "SIMPLE_SPAN_CONCENTRATED":
        calcRes = calcSimpleSpanConcentratedLoad(inputs.P || 0, length, inputs.a || (length/2), E, I, Z);
        break;
      default:
        diagnostics.push({ severity: "ERROR", message: `Unknown calculation type: ${calculationType}` });
    }

    if (calcRes.error) {
      diagnostics.push({ severity: "ERROR", message: calcRes.error });
    } else if (calcRes.formulas) {
      formulas.push(...calcRes.formulas);
      // Construct result with units
      results.moment = { value: calcRes.moment, unit: "lb-in" };
      results.stress = { value: calcRes.stress, unit: "psi" };
      if (calcRes.delta !== undefined) results.delta = { value: calcRes.delta, unit: "in" };
      if (calcRes.force !== undefined) results.force = { value: calcRes.force, unit: "lb" };
    }
  }

  return {
    moduleId: "2d-simplified-stress-check",
    engineeringLevel: "SCREENING",
    inputs: payload,
    formulas,
    assumptions,
    results,
    warnings,
    diagnostics
  };
}
