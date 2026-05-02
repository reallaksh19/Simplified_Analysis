/**
 * Engineering benchmark fixture schema helpers.
 *
 * `engineering-benchmark-v2` fixtures are strict. Legacy JSON files may remain
 * in the repo for reference, but the runner will not treat them as engineering
 * certification cases unless they explicitly declare this schema version.
 */

export const ENGINEERING_BENCHMARK_SCHEMA_VERSION = 'engineering-benchmark-v2';

export const REQUIRED_FIELDS = [
  'schemaVersion',
  'caseId',
  'title',
  'module',
  'solverExport',
  'methodId',
  'iconId',
  'input',
  'expected',
  'compare'
];

export function isEngineeringBenchmarkFixture(fixture) {
  return fixture?.schemaVersion === ENGINEERING_BENCHMARK_SCHEMA_VERSION;
}

export function validateFixture(fixture) {
  const missing = [];
  for (const key of REQUIRED_FIELDS) {
    if (!(key in fixture)) missing.push(key);
  }

  const errors = [];
  if (missing.length) errors.push(`Missing required field(s): ${missing.join(', ')}`);
  if (fixture.schemaVersion !== ENGINEERING_BENCHMARK_SCHEMA_VERSION) {
    errors.push(`Unsupported schemaVersion: ${fixture.schemaVersion ?? '<missing>'}`);
  }
  if (!fixture.compare || typeof fixture.compare !== 'object') {
    errors.push('compare must be an object.');
  } else if (!fixture.compare.mode) {
    errors.push('compare.mode is required.');
  }
  if (fixture.compare?.mode !== 'rounded-zero-error') {
    errors.push(`Unsupported compare.mode: ${fixture.compare?.mode}`);
  }

  return { valid: errors.length === 0, missing, errors };
}
