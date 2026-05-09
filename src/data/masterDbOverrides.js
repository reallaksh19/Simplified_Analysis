export const MASTER_DB_OVERRIDES_SCHEMA_VERSION = 'master-db-overrides-v19c';
const STORAGE_KEY = 'simplified-analysis-master-db-overrides-v19c';

let memoryOverrides = { schemaVersion: MASTER_DB_OVERRIDES_SCHEMA_VERSION, componentWeightRows: [], flangeDimensionalRows: [], b169FittingRows: [] };

function clone(value) { return JSON.parse(JSON.stringify(value ?? null)); }
function canUseLocalStorage() { return typeof window !== 'undefined' && Boolean(window.localStorage); }
function n(value, fallback = null) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }

function loadFromStorage() {
  if (!canUseLocalStorage()) return clone(memoryOverrides);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(memoryOverrides);
    const parsed = JSON.parse(raw);
    return {
      schemaVersion: MASTER_DB_OVERRIDES_SCHEMA_VERSION,
      componentWeightRows: Array.isArray(parsed.componentWeightRows) ? parsed.componentWeightRows : [],
      flangeDimensionalRows: Array.isArray(parsed.flangeDimensionalRows) ? parsed.flangeDimensionalRows : [],
      b169FittingRows: Array.isArray(parsed.b169FittingRows) ? parsed.b169FittingRows : [],
    };
  } catch {
    return clone(memoryOverrides);
  }
}

function saveToStorage(data) {
  memoryOverrides = clone(data);
  if (canUseLocalStorage()) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryOverrides, null, 2));
}

export function getMasterDbOverrides() { return loadFromStorage(); }
export function replaceMasterDbOverrides(next = {}) {
  const clean = {
    schemaVersion: MASTER_DB_OVERRIDES_SCHEMA_VERSION,
    componentWeightRows: Array.isArray(next.componentWeightRows) ? next.componentWeightRows : [],
    flangeDimensionalRows: Array.isArray(next.flangeDimensionalRows) ? next.flangeDimensionalRows : [],
    b169FittingRows: Array.isArray(next.b169FittingRows) ? next.b169FittingRows : [],
  };
  saveToStorage(clean);
  return clean;
}
export function exportMasterDbOverridesJson() { return JSON.stringify(getMasterDbOverrides(), null, 2); }
export function importMasterDbOverridesJson(text) { return replaceMasterDbOverrides(JSON.parse(text)); }
export function clearMasterDbOverrides() { return replaceMasterDbOverrides(); }

export function addComponentWeightOverride(row = {}) {
  const db = getMasterDbOverrides();
  const nextRow = {
    id: row.id || `USER-WT-${Date.now()}`,
    source: 'USER_MASTER_DB_OVERRIDE',
    sourceRevision: row.sourceRevision || 'USER',
    dataStatus: row.dataStatus || 'USER_DEFINED',
    componentType: String(row.componentType || 'VALVE').toUpperCase(),
    typeDesc: row.typeDesc || row.valveType || '',
    dn: n(row.dn),
    nps: n(row.nps),
    ratingClass: n(row.ratingClass, 300),
    rfFaceToFace_mm: n(row.rfFaceToFace_mm),
    rtjFaceToFace_mm: n(row.rtjFaceToFace_mm),
    bwFaceToFace_mm: n(row.bwFaceToFace_mm),
    rfRtjWeight_kg: n(row.rfRtjWeight_kg),
    bwWeight_kg: n(row.bwWeight_kg),
    raw: row.raw || row,
  };
  return replaceMasterDbOverrides({ ...db, componentWeightRows: [...db.componentWeightRows.filter((item) => item.id !== nextRow.id), nextRow] }).componentWeightRows.at(-1);
}

export function addFlangeDimensionalOverride(row = {}) {
  const db = getMasterDbOverrides();
  const nextRow = {
    id: row.id || `USER-FLG-DIM-${Date.now()}`,
    source: 'USER_MASTER_DB_OVERRIDE',
    sourceRevision: row.sourceRevision || 'USER',
    dataStatus: row.dataStatus || 'USER_DEFINED',
    dn: n(row.dn),
    nps: n(row.nps),
    ratingClass: n(row.ratingClass, 300),
    flangeType: row.flangeType || 'WN',
    faceType: row.faceType || 'RF',
    thickness_mm: n(row.thickness_mm),
    gasketAllowance_mm: n(row.gasketAllowance_mm, 0),
  };
  return replaceMasterDbOverrides({ ...db, flangeDimensionalRows: [...db.flangeDimensionalRows.filter((item) => item.id !== nextRow.id), nextRow] }).flangeDimensionalRows.at(-1);
}

export function addB169FittingOverride(row = {}) {
  const db = getMasterDbOverrides();
  const nextRow = { id: row.id || `USER-B169-${Date.now()}`, source: 'USER_MASTER_DB_OVERRIDE', sourceRevision: row.sourceRevision || 'USER', dataStatus: row.dataStatus || 'USER_DEFINED', ...row };
  return replaceMasterDbOverrides({ ...db, b169FittingRows: [...db.b169FittingRows.filter((item) => item.id !== nextRow.id), nextRow] }).b169FittingRows.at(-1);
}

export function getComponentWeightOverrideRows() { return getMasterDbOverrides().componentWeightRows; }
export function getFlangeDimensionalOverrideRows() { return getMasterDbOverrides().flangeDimensionalRows; }
export function getB169FittingOverrideRows() { return getMasterDbOverrides().b169FittingRows; }
