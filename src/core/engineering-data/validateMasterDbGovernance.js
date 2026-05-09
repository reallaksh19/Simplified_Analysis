import { getComponentWeightMasterRows } from '../../data/componentWeightMasterDb.js';
import { getFlangeDimensionalRows } from '../../data/flangeDimensionalMasterDb.js';
import { getB169FittingDimensionalRows } from '../../data/b169FittingDimensionalMasterDb.js';

export const MASTER_DB_GOVERNANCE_SCHEMA_VERSION = 'master-db-governance-v19d';
const FINAL_BLOCKING_STATUSES = new Set(['SCREENING_SAMPLE', 'SCREENING_APPROXIMATION', 'LEGACY_SCREENING', 'MISSING_DATA', 'AMBIGUOUS_MATCH']);
function diagnostic(severity, code, message, data = {}) { return { severity, code, message, data }; }
function finite(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
function isFinalIssue(issueType) { return String(issueType || '').toUpperCase() === 'FINAL_ISSUE'; }
function rowStatus(row = {}) { return row.dataStatus || row.sourceStatus || row.status || 'UNKNOWN'; }

export function validateComponentWeightMasterRows(rows = getComponentWeightMasterRows(), { issueType = 'SCREENING_ISSUE' } = {}) {
  const diagnostics = [];
  for (const row of rows) {
    const id = row.id || 'UNKNOWN_COMPONENT_WEIGHT_ROW'; const status = rowStatus(row);
    if (!row.componentType) diagnostics.push(diagnostic('error','MASTER_COMPONENT_TYPE_MISSING',`Component master row ${id} is missing component type.`,{rowId:id}));
    if (finite(row.dn) === null && finite(row.nps) === null) diagnostics.push(diagnostic('error','MASTER_COMPONENT_SIZE_MISSING',`Component master row ${id} is missing DN/NPS.`,{rowId:id}));
    if (isFinalIssue(issueType) && FINAL_BLOCKING_STATUSES.has(status)) diagnostics.push(diagnostic('error','MASTER_COMPONENT_ROW_NOT_FINAL_QUALITY',`Component master row ${id} has non-final data status ${status}.`,{rowId:id,status}));
  }
  return diagnostics;
}
export function validateFlangeDimensionalRows(rows = getFlangeDimensionalRows(), { issueType = 'SCREENING_ISSUE' } = {}) {
  const diagnostics = [];
  for (const row of rows) {
    const id = row.id || 'UNKNOWN_FLANGE_DIM_ROW'; const status = rowStatus(row);
    if (finite(row.dn) === null && finite(row.nps) === null) diagnostics.push(diagnostic('error','MASTER_FLANGE_SIZE_MISSING',`Flange dimension row ${id} is missing DN/NPS.`,{rowId:id}));
    if (finite(row.thickness_mm) === null || finite(row.thickness_mm) <= 0) diagnostics.push(diagnostic('error','MASTER_FLANGE_THICKNESS_MISSING',`Flange dimension row ${id} is missing flange thickness.`,{rowId:id}));
    if (isFinalIssue(issueType) && FINAL_BLOCKING_STATUSES.has(status)) diagnostics.push(diagnostic('error','MASTER_FLANGE_ROW_NOT_FINAL_QUALITY',`Flange dimension row ${id} has non-final data status ${status}.`,{rowId:id,status}));
  }
  return diagnostics;
}
export function validateB169FittingRows(rows = getB169FittingDimensionalRows(), { issueType = 'SCREENING_ISSUE' } = {}) {
  const diagnostics = [];
  for (const row of rows) {
    const id = row.id || 'UNKNOWN_B169_ROW'; const status = rowStatus(row);
    if (!row.fittingType) diagnostics.push(diagnostic('error','MASTER_B169_FITTING_TYPE_MISSING',`B16.9 row ${id} is missing fitting type.`,{rowId:id}));
    if (row.fittingType === 'REDUCER' && finite(row.length_mm) === null) diagnostics.push(diagnostic('error','MASTER_B169_REDUCER_LENGTH_MISSING',`Reducer row ${id} is missing length.`,{rowId:id}));
    if (row.fittingType === 'TEE' && (finite(row.runC2E_mm) === null || finite(row.branchC2E_mm) === null)) diagnostics.push(diagnostic('error','MASTER_B169_TEE_C2E_MISSING',`Tee row ${id} is missing C2E dimensions.`,{rowId:id}));
    if (isFinalIssue(issueType) && FINAL_BLOCKING_STATUSES.has(status)) diagnostics.push(diagnostic('error','MASTER_B169_ROW_NOT_FINAL_QUALITY',`B16.9 row ${id} has non-final data status ${status}.`,{rowId:id,status}));
  }
  return diagnostics;
}
export function validateCalculationModelMasterDbUsage(model = {}, { issueType = 'SCREENING_ISSUE' } = {}) {
  const diagnostics = [];
  for (const segment of model.segments || []) {
    const type = String(segment.type || segment.properties?.type || 'PIPE').toUpperCase();
    if (type === 'PIPE' && !segment.lineClass?.ratingClass && !segment.properties?.ratingClass) diagnostics.push(diagnostic('error','MODEL_SEGMENT_RATING_MISSING',`Segment ${segment.id} is missing rating/class.`,{segmentId:segment.id}));
    if (['REDUCER','TEE'].includes(type)) {
      const status = segment.componentData?.fittingDimensionStatus || segment.componentData?.dataStatus || 'UNKNOWN';
      if (isFinalIssue(issueType) && FINAL_BLOCKING_STATUSES.has(status)) diagnostics.push(diagnostic('error','MODEL_B169_FITTING_NOT_FINAL_QUALITY',`Component on segment ${segment.id} uses non-final B16.9 fitting data status ${status}.`,{segmentId:segment.id,status}));
    }
    if (type === 'FLANGE_VALVE_FLANGE') {
      const status = segment.componentData?.flangeDimensionStatus || segment.componentData?.dataStatus || 'UNKNOWN';
      if (isFinalIssue(issueType) && FINAL_BLOCKING_STATUSES.has(status)) diagnostics.push(diagnostic('error','MODEL_COMPONENT_NOT_FINAL_QUALITY',`FVF on segment ${segment.id} uses non-final data status ${status}.`,{segmentId:segment.id,status}));
    }
  }
  return diagnostics;
}
export function buildMasterDbGovernanceSummary({ model = null, issueType = 'SCREENING_ISSUE', validateWholeDb = false } = {}) {
  const diagnostics = [];
  if (validateWholeDb) {
    diagnostics.push(...validateComponentWeightMasterRows(undefined, { issueType }));
    diagnostics.push(...validateFlangeDimensionalRows(undefined, { issueType }));
    diagnostics.push(...validateB169FittingRows(undefined, { issueType }));
  }
  if (model) diagnostics.push(...validateCalculationModelMasterDbUsage(model, { issueType }));
  const errors = diagnostics.filter((item) => item.severity === 'error').length;
  const warnings = diagnostics.filter((item) => item.severity === 'warn').length;
  return { schemaVersion: MASTER_DB_GOVERNANCE_SCHEMA_VERSION, issueType, validateWholeDb, status: errors ? 'BLOCKED' : warnings ? 'PASSED_WITH_WARNINGS' : 'PASSED', counts: { componentWeightRows: getComponentWeightMasterRows().length, flangeDimensionalRows: getFlangeDimensionalRows().length, b169FittingRows: getB169FittingDimensionalRows().length, diagnostics: diagnostics.length, errors, warnings }, diagnostics, blockers: diagnostics.filter((item) => item.severity === 'error').map((item) => ({ code: item.code, message: item.message, data: item.data })) };
}
