import fs from 'fs';
import path from 'path';
import { isEngineeringBenchmarkFixture, validateFixture } from './benchmarkSchema.js';

/**
 * Recursively loads engineering-benchmark-v2 fixtures from a root directory.
 * Legacy JSON benchmark/reference files are counted as skipped legacy fixtures;
 * malformed v2 fixtures are reported as invalid and must fail certification.
 */
export function loadBenchmarkFixtures(rootDir, options = {}) {
  const absoluteRoot = path.resolve(process.cwd(), rootDir);
  const fixtures = [];
  const invalidFixtures = [];
  const skippedLegacy = [];
  const unreadable = [];

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        try {
          const raw = fs.readFileSync(full, 'utf8');
          const json = JSON.parse(raw);
          if (!isEngineeringBenchmarkFixture(json)) {
            skippedLegacy.push({ file: full, reason: 'not engineering-benchmark-v2' });
            continue;
          }
          const validation = validateFixture(json);
          if (!validation.valid) {
            invalidFixtures.push({ file: full, errors: validation.errors });
            continue;
          }
          json.__filePath = full;
          fixtures.push(json);
        } catch (err) {
          unreadable.push({ file: full, error: err.message });
        }
      }
    }
  }

  walk(absoluteRoot);

  if (options.includeDiagnostics) {
    return { fixtures, invalidFixtures, skippedLegacy, unreadable };
  }
  return fixtures;
}
