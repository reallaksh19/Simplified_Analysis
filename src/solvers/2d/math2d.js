/**
 * Core mathematical functions for 2D screening calculations.
 * Deterministic, stateless, unit-declared, and benchmarkable.
 */

const UNIT_SYSTEM_2D = Object.freeze({
  length: 'in',
  force: 'lbf',
  stress: 'psi',
  moment: 'in-lbf'
});

function numberOr(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeArgs(args, keys) {
  if (args.length === 1 && args[0] && typeof args[0] === 'object' && !Array.isArray(args[0])) {
    return args[0];
  }
  return keys.reduce((acc, key, idx) => {
    acc[key] = args[idx];
    return acc;
  }, {});
}

function invalidResult({ moduleId = '2d-math', methodId, formulaIds, inputs, message }) {
  return {
    moduleId,
    methodId,
    formulaIds,
    unitSystem: UNIT_SYSTEM_2D,
    inputs,
    outputs: {},
    status: 'FAILED',
    diagnostics: [{ severity: 'ERROR', message }],
    error: message
  };
}

function withContract({ methodId, formulaIds, inputs, outputs, type }) {
  return {
    moduleId: '2d-math',
    type,
    status: 'PASSED',
    methodId,
    formulaIds,
    unitSystem: UNIT_SYSTEM_2D,
    inputs,
    outputs,
    diagnostics: [],
    ...outputs
  };
}

/** Cantilever with end load: M = P L, S = M / Z, d = P L^3 / 3EI. */
export function calcCantileverEndLoad(...args) {
  const input = normalizeArgs(args, ['P', 'L', 'E', 'I', 'Z']);
  const P = numberOr(input.P);
  const L = numberOr(input.L);
  const E = numberOr(input.E);
  const I = numberOr(input.I);
  const Z = numberOr(input.Z);
  const formulaIds = ['CANTILEVER_M_PL', 'CANTILEVER_STRESS_M_OVER_Z', 'CANTILEVER_DELTA_PL3_3EI'];
  if (L <= 0 || E <= 0 || I <= 0 || Z <= 0) {
    return invalidResult({ methodId: 'CANTILEVER_END_LOAD', formulaIds, inputs: input, message: 'Invalid inputs for cantilever' });
  }
  const moment = P * L;
  const stress = moment / Z;
  const delta = (P * Math.pow(L, 3)) / (3 * E * I);
  return withContract({
    methodId: 'CANTILEVER_END_LOAD',
    formulaIds,
    inputs: { P, L, E, I, Z },
    outputs: { moment, stress, delta },
    type: 'CANTILEVER_END_LOAD'
  });
}

/** Simply supported span with uniformly distributed load. */
export function calcSimpleSpanDistributedLoad(...args) {
  const input = normalizeArgs(args, ['w', 'L', 'E', 'I', 'Z']);
  const w = numberOr(input.w);
  const L = numberOr(input.L);
  const E = numberOr(input.E);
  const I = numberOr(input.I);
  const Z = numberOr(input.Z);
  const formulaIds = ['SIMPLE_SPAN_UDL_M_WL2_8', 'CANTILEVER_STRESS_M_OVER_Z', 'SIMPLE_SPAN_UDL_DELTA_5WL4_384EI'];
  if (L <= 0 || E <= 0 || I <= 0 || Z <= 0) {
    return invalidResult({ methodId: 'SIMPLE_SPAN_DISTRIBUTED', formulaIds, inputs: input, message: 'Invalid inputs for simple span UDL' });
  }
  const moment = (w * Math.pow(L, 2)) / 8;
  const stress = moment / Z;
  const delta = (5 * w * Math.pow(L, 4)) / (384 * E * I);
  return withContract({
    methodId: 'SIMPLE_SPAN_DISTRIBUTED',
    formulaIds,
    inputs: { w, L, E, I, Z },
    outputs: { moment, stress, delta },
    type: 'SIMPLE_SPAN_DISTRIBUTED'
  });
}

/** Guided cantilever thermal displacement, 12EIδ/L³ form. */
export function calcGuidedCantileverThermal(...args) {
  const input = normalizeArgs(args, ['deltaX', 'L', 'E', 'I', 'OD', 'Z']);
  const deltaX = numberOr(input.deltaX);
  const L = numberOr(input.L);
  const E = numberOr(input.E);
  const I = numberOr(input.I);
  const OD = numberOr(input.OD);
  const Z = input.Z != null ? numberOr(input.Z) : (OD > 0 ? (2 * I) / OD : 0);
  const formulaIds = ['GUIDED_CANTILEVER_F_12EID_OVER_L3', 'GUIDED_CANTILEVER_M_FL_OVER_2', 'CANTILEVER_STRESS_M_OVER_Z'];
  if (L <= 0 || E <= 0 || I <= 0 || OD <= 0 || Z <= 0) {
    return invalidResult({ methodId: 'GC_BASIC_12EI', formulaIds, inputs: input, message: 'Invalid inputs for guided cantilever' });
  }
  const force = (12 * E * I * deltaX) / Math.pow(L, 3);
  const moment = (force * L) / 2;
  const stress = moment / Z;
  return withContract({
    methodId: 'GC_BASIC_12EI',
    formulaIds,
    inputs: { deltaX, L, E, I, OD, Z },
    outputs: { force, moment, stress },
    type: 'GUIDED_CANTILEVER_THERMAL'
  });
}

/** Concentrated load bending check on a simple span. */
export function calcSimpleSpanPointLoad(...args) {
  const input = normalizeArgs(args, ['P', 'L', 'a', 'E', 'I', 'Z']);
  const P = numberOr(input.P);
  const L = numberOr(input.L);
  const a = numberOr(input.a);
  const E = numberOr(input.E);
  const I = numberOr(input.I);
  const Z = numberOr(input.Z);
  const formulaIds = ['SIMPLE_SPAN_POINT_M_PAB_OVER_L', 'CANTILEVER_STRESS_M_OVER_Z'];
  if (L <= 0 || E <= 0 || I <= 0 || Z <= 0 || a < 0 || a > L) {
    return invalidResult({ methodId: 'SIMPLE_SPAN_CONCENTRATED', formulaIds, inputs: input, message: 'Invalid inputs for concentrated load' });
  }
  const b = L - a;
  const moment = (P * a * b) / L;
  const stress = moment / Z;
  const delta = (P * Math.pow(a, 2) * Math.pow(b, 2)) / (3 * E * I * L);
  return withContract({
    methodId: 'SIMPLE_SPAN_CONCENTRATED',
    formulaIds,
    inputs: { P, L, a, E, I, Z },
    outputs: { moment, stress, delta },
    type: 'SIMPLE_SPAN_CONCENTRATED'
  });
}

export const calcSimpleSpanConcentratedLoad = calcSimpleSpanPointLoad;
