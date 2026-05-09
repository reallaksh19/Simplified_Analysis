import { getB169FittingOverrideRows } from './masterDbOverrides.js';

export const B169_FITTING_DIMENSIONAL_SCHEMA_VERSION = 'b16-9-fitting-dimensional-master-v19e';
function n(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
function same(a, b) { const av = n(a); const bv = n(b); return av !== null && bv !== null && Math.abs(av - bv) <= Math.max(1.5, Math.abs(bv) * 0.006); }
function diag(severity, code, message, data = {}) { return { severity, code, message, data }; }

export const b169FittingDimensionalRows = [
  { id: 'B169-TEE-DN100-EQUAL-STD', fittingType: 'TEE', teeType: 'EQUAL', headerDn: 100, branchDn: 100, schedule: 'STD', runC2E_mm: 102, branchC2E_mm: 102, source: 'PROJECT_SCREENING_SEED_B16_9', sourceRevision: 'V19E-SEED', dataStatus: 'SCREENING_SAMPLE' },
  { id: 'B169-TEE-DN150-EQUAL-STD', fittingType: 'TEE', teeType: 'EQUAL', headerDn: 150, branchDn: 150, schedule: 'STD', runC2E_mm: 140, branchC2E_mm: 140, source: 'PROJECT_SCREENING_SEED_B16_9', sourceRevision: 'V19E-SEED', dataStatus: 'SCREENING_SAMPLE' },
  { id: 'B169-TEE-DN200-EQUAL-STD', fittingType: 'TEE', teeType: 'EQUAL', headerDn: 200, branchDn: 200, schedule: 'STD', runC2E_mm: 178, branchC2E_mm: 178, source: 'PROJECT_SCREENING_SEED_B16_9', sourceRevision: 'V19E-SEED', dataStatus: 'SCREENING_SAMPLE' },
  { id: 'B169-TEE-DN200xDN100-REDUCING-STD', fittingType: 'TEE', teeType: 'REDUCING', headerDn: 200, branchDn: 100, schedule: 'STD', runC2E_mm: 178, branchC2E_mm: 127, source: 'PROJECT_SCREENING_SEED_B16_9', sourceRevision: 'V19E-SEED', dataStatus: 'SCREENING_SAMPLE' },
  { id: 'B169-RED-DN100xDN50-CONC-STD', fittingType: 'REDUCER', reducerType: 'CONCENTRIC', fromDn: 100, toDn: 50, scheduleFrom: 'STD', scheduleTo: 'STD', length_mm: 102, source: 'PROJECT_SCREENING_SEED_B16_9', sourceRevision: 'V19E-SEED', dataStatus: 'SCREENING_SAMPLE' },
  { id: 'B169-RED-DN150xDN100-CONC-STD', fittingType: 'REDUCER', reducerType: 'CONCENTRIC', fromDn: 150, toDn: 100, scheduleFrom: 'STD', scheduleTo: 'STD', length_mm: 140, source: 'PROJECT_SCREENING_SEED_B16_9', sourceRevision: 'V19E-SEED', dataStatus: 'SCREENING_SAMPLE' },
  { id: 'B169-RED-DN200xDN150-CONC-STD', fittingType: 'REDUCER', reducerType: 'CONCENTRIC', fromDn: 200, toDn: 150, scheduleFrom: 'STD', scheduleTo: 'STD', length_mm: 152, source: 'PROJECT_SCREENING_SEED_B16_9', sourceRevision: 'V19E-SEED', dataStatus: 'SCREENING_SAMPLE' },
];

export function getB169FittingDimensionalRows() { return [...getB169FittingOverrideRows(), ...b169FittingDimensionalRows]; }
export function findReducerDimensionCandidates({ fromDn, toDn, reducerType = 'CONCENTRIC', scheduleFrom = 'STD', scheduleTo = 'STD' } = {}) {
  return getB169FittingDimensionalRows().filter((row) => row.fittingType === 'REDUCER' && same(row.fromDn, fromDn) && same(row.toDn, toDn) && String(row.reducerType).toUpperCase() === String(reducerType).toUpperCase() && String(row.scheduleFrom || 'STD').toUpperCase() === String(scheduleFrom).toUpperCase() && String(row.scheduleTo || 'STD').toUpperCase() === String(scheduleTo).toUpperCase());
}
export function findTeeDimensionCandidates({ headerDn, branchDn, teeType = null, schedule = 'STD' } = {}) {
  return getB169FittingDimensionalRows().filter((row) => row.fittingType === 'TEE' && same(row.headerDn, headerDn) && same(row.branchDn, branchDn) && (!teeType || String(row.teeType).toUpperCase() === String(teeType).toUpperCase()) && String(row.schedule || 'STD').toUpperCase() === String(schedule).toUpperCase());
}
export function resolveReducerDimensions(input = {}) {
  const candidates = findReducerDimensionCandidates(input);
  if (candidates.length === 1) {
    const row = candidates[0];
    return { isQualified: true, status: row.dataStatus || 'PASSED', value: { ...row, fittingDimensionSource: row.source, fittingDimensionSourceRevision: row.sourceRevision, fittingDimensionStatus: row.dataStatus }, source: row.source, sourceRevision: row.sourceRevision, diagnostics: row.dataStatus === 'SCREENING_SAMPLE' ? [diag('warn', 'B169_REDUCER_DIMENSION_SCREENING_SAMPLE', 'Reducer dimension is from B16.9 screening seed table.', { rowId: row.id })] : [], row };
  }
  if (candidates.length > 1) return { isQualified: false, status: 'AMBIGUOUS_MATCH', value: null, source: 'b16-9-fitting-dimensional-master', diagnostics: [diag('error', 'B169_REDUCER_DIMENSION_AMBIGUOUS', `Multiple reducer dimension rows match DN${input.fromDn} x DN${input.toDn}.`, { candidateIds: candidates.map((row) => row.id) })], candidates };
  return { isQualified: false, status: 'MISSING_DATA', value: null, source: 'b16-9-fitting-dimensional-master', diagnostics: [diag('error', 'B169_REDUCER_DIMENSION_MISSING', `No B16.9 reducer dimension row found for DN${input.fromDn} x DN${input.toDn}.`, input)] };
}
export function resolveTeeDimensions(input = {}) {
  const candidates = findTeeDimensionCandidates(input);
  if (candidates.length === 1) {
    const row = candidates[0];
    return { isQualified: true, status: row.dataStatus || 'PASSED', value: { ...row, fittingDimensionSource: row.source, fittingDimensionSourceRevision: row.sourceRevision, fittingDimensionStatus: row.dataStatus }, source: row.source, sourceRevision: row.sourceRevision, diagnostics: row.dataStatus === 'SCREENING_SAMPLE' ? [diag('warn', 'B169_TEE_DIMENSION_SCREENING_SAMPLE', 'Tee dimension is from B16.9 screening seed table.', { rowId: row.id })] : [], row };
  }
  if (candidates.length > 1) return { isQualified: false, status: 'AMBIGUOUS_MATCH', value: null, source: 'b16-9-fitting-dimensional-master', diagnostics: [diag('error', 'B169_TEE_DIMENSION_AMBIGUOUS', `Multiple tee dimension rows match header DN${input.headerDn}, branch DN${input.branchDn}.`, { candidateIds: candidates.map((row) => row.id) })], candidates };
  return { isQualified: false, status: 'MISSING_DATA', value: null, source: 'b16-9-fitting-dimensional-master', diagnostics: [diag('error', 'B169_TEE_DIMENSION_MISSING', `No B16.9 tee dimension row found for header DN${input.headerDn}, branch DN${input.branchDn}.`, input)] };
}
