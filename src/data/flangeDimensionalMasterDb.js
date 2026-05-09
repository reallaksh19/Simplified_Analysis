import { getFlangeDimensionalOverrideRows } from './masterDbOverrides.js';

export const FLANGE_DIMENSIONAL_MASTER_SCHEMA_VERSION = 'flange-dimensional-master-v19b';
function n(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
function same(a, b) { const av = n(a); const bv = n(b); return av !== null && bv !== null && Math.abs(av - bv) <= Math.max(1.5, Math.abs(bv) * 0.006); }

export const flangeDimensionalRows = [
  { id: 'FLG-DIM-DN100-CL150-WN-RF', dn: 100, nps: 4, ratingClass: 150, flangeType: 'WN', faceType: 'RF', thickness_mm: 30.2, gasketAllowance_mm: 3, source: 'PROJECT_SCREENING_SEED_FLANGE_DIMENSIONS', sourceRevision: 'V19B-SEED', dataStatus: 'SCREENING_SAMPLE' },
  { id: 'FLG-DIM-DN150-CL150-WN-RF', dn: 150, nps: 6, ratingClass: 150, flangeType: 'WN', faceType: 'RF', thickness_mm: 35.0, gasketAllowance_mm: 3, source: 'PROJECT_SCREENING_SEED_FLANGE_DIMENSIONS', sourceRevision: 'V19B-SEED', dataStatus: 'SCREENING_SAMPLE' },
  { id: 'FLG-DIM-DN200-CL150-WN-RF', dn: 200, nps: 8, ratingClass: 150, flangeType: 'WN', faceType: 'RF', thickness_mm: 39.7, gasketAllowance_mm: 3, source: 'PROJECT_SCREENING_SEED_FLANGE_DIMENSIONS', sourceRevision: 'V19B-SEED', dataStatus: 'SCREENING_SAMPLE' },
  { id: 'FLG-DIM-DN200-CL300-WN-RF', dn: 200, nps: 8, ratingClass: 300, flangeType: 'WN', faceType: 'RF', thickness_mm: 41.3, gasketAllowance_mm: 3, source: 'PROJECT_SCREENING_SEED_FLANGE_DIMENSIONS', sourceRevision: 'V19B-SEED', dataStatus: 'SCREENING_SAMPLE' },
];

export function getFlangeDimensionalRows() { return [...getFlangeDimensionalOverrideRows(), ...flangeDimensionalRows]; }
export function findFlangeDimensionCandidates({ dn, nps = null, ratingClass = 300, flangeType = 'WN', faceType = 'RF' } = {}) {
  return getFlangeDimensionalRows().filter((row) => (!dn || same(row.dn, dn)) && (!nps || row.nps == null || same(row.nps, nps)) && n(row.ratingClass) === n(ratingClass) && String(row.flangeType).toUpperCase() === String(flangeType).toUpperCase() && String(row.faceType).toUpperCase() === String(faceType).toUpperCase());
}
export function resolveFlangeDimensions(input = {}) {
  const candidates = findFlangeDimensionCandidates(input);
  if (candidates.length === 1) {
    const row = candidates[0];
    return { isQualified: true, status: row.dataStatus || 'PASSED', value: { ...row, flangeDimensionSource: row.source, flangeDimensionSourceRevision: row.sourceRevision, flangeDimensionStatus: row.dataStatus }, source: row.source, sourceRevision: row.sourceRevision, diagnostics: row.dataStatus === 'SCREENING_SAMPLE' ? [{ severity: 'warn', code: 'FLANGE_DIMENSION_SCREENING_SAMPLE', message: 'Flange dimension is from screening seed master data.', data: { rowId: row.id } }] : [], row };
  }
  if (candidates.length > 1) return { isQualified: false, status: 'AMBIGUOUS_MATCH', value: null, source: 'flange-dimensional-master', diagnostics: [{ severity: 'error', code: 'FLANGE_DIMENSION_AMBIGUOUS', message: `Multiple flange dimension rows match DN${input.dn} CL${input.ratingClass}.`, data: { candidateIds: candidates.map((row) => row.id) } }], candidates };
  return { isQualified: false, status: 'MISSING_DATA', value: null, source: 'flange-dimensional-master', diagnostics: [{ severity: 'error', code: 'FLANGE_DIMENSION_MISSING', message: `No flange dimension row found for DN${input.dn} CL${input.ratingClass}.`, data: input }] };
}
