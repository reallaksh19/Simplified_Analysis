/**
 * Compares an actual value to an expected value with an optional tolerance.
 * Handles numbers, objects, arrays, and primitives.
 */
export function compareWithTolerance(actual, expected, tolerance = 1e-6) {
  if (typeof actual === 'number' && typeof expected === 'number') {
    const delta = Math.abs(actual - expected);
    return {
      passed: delta <= tolerance,
      actual,
      expected,
      delta,
      tolerance
    };
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return { passed: false, actual, expected, reason: 'Expected array' };
    if (actual.length !== expected.length) return { passed: false, actual, expected, reason: 'Length mismatch' };

    let allPassed = true;
    const details = [];
    for (let i = 0; i < expected.length; i++) {
      const res = compareWithTolerance(actual[i], expected[i], tolerance);
      if (!res.passed) allPassed = false;
      details.push(res);
    }
    return { passed: allPassed, details, actual, expected };
  }

  if (expected !== null && typeof expected === 'object') {
    if (actual === null || typeof actual !== 'object') return { passed: false, actual, expected, reason: 'Expected object' };

    let allPassed = true;
    const details = {};
    for (const key of Object.keys(expected)) {
      // If expected value is explicitly null and we allow actual to be anything, or handle it properly
      if (actual[key] === undefined && expected[key] !== undefined) {
          allPassed = false;
          details[key] = { passed: false, reason: 'Missing key in actual' };
          continue;
      }

      const res = compareWithTolerance(actual[key], expected[key], tolerance);
      if (!res.passed) allPassed = false;
      details[key] = res;
    }
    return { passed: allPassed, details, actual, expected };
  }

  // Primitives fallback
  return {
    passed: actual === expected,
    actual,
    expected,
    reason: actual !== expected ? 'Value mismatch' : undefined
  };
}

/**
 * Validates a benchmark case numeric result against expectations.
 */
export function validateBenchmarkResult(fixture, actualResult) {
  if (fixture.sourceStatus === 'PENDING_NUMERIC_EXTRACTION') {
    return {
      status: 'PENDING',
      message: 'Pending numeric extraction',
      details: null
    };
  }

  if (!fixture.expected) {
    return {
      status: 'FAILED',
      message: 'Missing expected result in fixture',
      details: null
    };
  }

  // Handle tolerance lookup, defaulting to 1e-6 if not specified
  const getToleranceForPath = (path) => {
    if (!fixture.tolerance) return 1e-6;
    if (typeof fixture.tolerance === 'number') return fixture.tolerance;
    // Object tolerance mapping
    // Can enhance to support dotted paths, keeping it simple for now
    return 1e-6; // Fallback
  };

  const comparison = compareWithTolerance(actualResult, fixture.expected, getToleranceForPath());

  if (comparison.passed) {
    return {
      status: 'PASSED',
      details: comparison
    };
  }

  return {
    status: 'FAILED',
    message: 'Result outside tolerance',
    details: comparison
  };
}

// Engineering benchmark tolerance tiers:
// TIGHT (0.5%): exact algebraic cases where round-trip should be lossless
// STANDARD (2%): floating-point interpolation + rounding, expected precision for screening calcs
// LOOSE (5%): cases with known simplifying assumptions (e.g. Rule of Rigidity filter)
export const TOLERANCE = {
  TIGHT:    0.005, // exact algebra — e.g. section properties, thermal displacement
  STANDARD: 0.02,  // interpolated DB values, combined stresses
  LOOSE:    0.05,  // geometry filtering, methodology divergence
};
export const DEFAULT_TOLERANCE = 0.02;