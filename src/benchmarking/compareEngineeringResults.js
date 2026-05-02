/**
 * Compares an engineering result against an expected result defined in a
 * benchmark fixture.  The comparison rules support numeric rounding to
 * accommodate floating point differences.  Non‑numeric mismatches will
 * result in a failed comparison.  The function returns an object
 * containing a boolean passed flag, the maximum numeric error observed,
 * and a detailed comparison tree.
 *
 * @param {object} fixture The benchmark fixture (includes compare config)
 * @param {object} actual The actual result produced by the solver
 * @returns {{passed: boolean, maxError: number, details: any}}
 */
export function compareEngineeringResults(fixture, actual) {
  const compare = fixture.compare || {};
  const decimals = typeof compare.roundDecimals === 'number' ? compare.roundDecimals : 12;
  let maxError = 0;
  function round(val) {
    return Number.parseFloat(Number(val).toFixed(decimals));
  }
  function compareValues(act, exp, path = '') {
    // Numeric expectation
    if (typeof exp === 'number') {
      if (typeof act !== 'number') {
        return { passed: false, path, reason: `Expected number but got ${typeof act}` };
      }
      const rAct = round(act);
      const rExp = round(exp);
      const err = Math.abs(rAct - rExp);
      if (err > maxError) maxError = err;
      return { passed: rAct === rExp, actual: rAct, expected: rExp, error: err };
    }
    // Array expectation
    if (Array.isArray(exp)) {
      if (!Array.isArray(act)) {
        return { passed: false, path, reason: 'Expected array' };
      }
      if (act.length !== exp.length) {
        return { passed: false, path, reason: 'Array length mismatch' };
      }
      const details = [];
      let allPass = true;
      for (let i = 0; i < exp.length; i++) {
        const res = compareValues(act[i], exp[i], `${path}[${i}]`);
        if (!res.passed) allPass = false;
        details.push(res);
      }
      return { passed: allPass, details };
    }
    // Object expectation
    if (exp && typeof exp === 'object') {
      if (!act || typeof act !== 'object') {
        return { passed: false, path, reason: 'Expected object' };
      }
      const details = {};
      let allPass = true;
      for (const key of Object.keys(exp)) {
        const res = compareValues(act[key], exp[key], path ? `${path}.${key}` : key);
        if (!res.passed) allPass = false;
        details[key] = res;
      }
      return { passed: allPass, details };
    }
    // Primitive (string, boolean, null) expectation
    const passed = act === exp;
    return { passed, actual: act, expected: exp };
  }
  const rootComparison = compareValues(actual, fixture.expected);
  const passed = rootComparison.passed && maxError === 0;
  return { passed, maxError, details: rootComparison };
}