/**
 * Core mathematical functions for 2D screening calculations.
 * Deterministic and stateless.
 */

/**
 * Cantilever with end load.
 */
export function calcCantileverEndLoad(P, L, E, I, Z) {
  if (L <= 0 || E <= 0 || I <= 0 || Z <= 0) return { error: "Invalid inputs for cantilever" };
  const moment = P * L;
  const stress = moment / Z;
  const delta = (P * Math.pow(L, 3)) / (3 * E * I);

  return {
    type: "CANTILEVER_END_LOAD",
    moment,
    stress,
    delta,
    formulas: [
      "M = P * L",
      "Stress = M / Z",
      "Delta = (P * L^3) / (3 * E * I)"
    ]
  };
}

/**
 * Simply supported span with distributed load.
 */
export function calcSimpleSpanDistributedLoad(w, L, E, I, Z) {
  if (L <= 0 || E <= 0 || I <= 0 || Z <= 0) return { error: "Invalid inputs for simple span" };
  const moment = (w * Math.pow(L, 2)) / 8;
  const stress = moment / Z;
  const delta = (5 * w * Math.pow(L, 4)) / (384 * E * I);

  return {
    type: "SIMPLE_SPAN_DISTRIBUTED",
    moment,
    stress,
    delta,
    formulas: [
      "M = (w * L^2) / 8",
      "Stress = M / Z",
      "Delta = (5 * w * L^4) / (384 * E * I)"
    ]
  };
}

/**
 * Guided cantilever thermal displacement screening.
 */
export function calcGuidedCantileverThermal(deltaX, L, E, I, OD) {
  if (L <= 0 || E <= 0 || I <= 0 || OD <= 0) return { error: "Invalid inputs for guided cantilever" };

  // Delta given in inches typically
  // Length given in inches
  // F = 12 * E * I * deltaX / L^3  (standard guided cantilever formula)
  const force = (12 * E * I * deltaX) / Math.pow(L, 3);

  // M = F * L / 2 = 6 * E * I * delta / L^2
  const moment = (force * L) / 2;

  // Z = 2 * I / OD
  const Z = (2 * I) / OD;
  const stress = moment / Z;

  return {
    type: "GUIDED_CANTILEVER_THERMAL",
    force,
    moment,
    stress,
    formulas: [
      "F = (12 * E * I * deltaX) / L^3",
      "M = (F * L) / 2",
      "Stress = M / Z"
    ]
  };
}

/**
 * Concentrated load bending check on a simple span
 */
export function calcSimpleSpanConcentratedLoad(P, L, a, E, I, Z) {
   if (L <= 0 || E <= 0 || I <= 0 || Z <= 0 || a < 0 || a > L) return { error: "Invalid inputs for concentrated load" };
   const b = L - a;
   // Max moment at load point: M = P*a*b/L
   const moment = (P * a * b) / L;
   const stress = moment / Z;
   // Max deflection near center approximation or exact under load if at center.
   // For screening, we use deflection at load: delta = (P * a^2 * b^2) / (3 * E * I * L)
   const delta = (P * Math.pow(a, 2) * Math.pow(b, 2)) / (3 * E * I * L);

   return {
     type: "SIMPLE_SPAN_CONCENTRATED",
     moment,
     stress,
     delta,
     formulas: [
       "M = (P * a * b) / L",
       "Stress = M / Z",
       "Delta = (P * a^2 * b^2) / (3 * E * I * L)"
     ]
   };
}
