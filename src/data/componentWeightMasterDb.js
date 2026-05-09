import { getComponentWeightOverrideRows } from './masterDbOverrides.js';

const legacyRows = [
  {
    "Type": "VALVE",
    "DN": 100,
    "NS": 4,
    "Rating": 150,
    "TypeDesc": "Flanged Swing check Valve",
    "RF-F/F": 292,
    "RTJ F/F": 292,
    "BW-F/F": null,
    "RF/RTJ KG": 35,
    "BW KG": null
  },
  {
    "Type": "VALVE",
    "DN": 150,
    "NS": 6,
    "Rating": 150,
    "TypeDesc": "Flanged Swing check Valve",
    "RF-F/F": 356,
    "RTJ F/F": 356,
    "BW-F/F": null,
    "RF/RTJ KG": 62,
    "BW KG": null
  },
  {
    "Type": "VALVE",
    "DN": 200,
    "NS": 8,
    "Rating": 150,
    "TypeDesc": "Flanged Swing check Valve",
    "RF-F/F": 495,
    "RTJ F/F": 495,
    "BW-F/F": null,
    "RF/RTJ KG": 105,
    "BW KG": null
  },
  {
    "Type": "VALVE",
    "DN": 200,
    "NS": 8,
    "Rating": 300,
    "TypeDesc": "Flanged Swing check Valve",
    "RF-F/F": 495,
    "RTJ F/F": 495,
    "BW-F/F": null,
    "RF/RTJ KG": 142,
    "BW KG": null
  },
  {
    "Type": "FLANGE",
    "DN": 150,
    "NS": 6,
    "Rating": 300,
    "TypeDesc": "WN RF Flange",
    "RF-F/F": null,
    "RTJ F/F": null,
    "BW-F/F": null,
    "RF/RTJ KG": 19,
    "BW KG": null
  },
  {
    "Type": "FLANGE",
    "DN": 200,
    "NS": 8,
    "Rating": 300,
    "TypeDesc": "WN RF Flange",
    "RF-F/F": null,
    "RTJ F/F": null,
    "BW-F/F": null,
    "RF/RTJ KG": 28,
    "BW KG": null
  }
];

export const COMPONENT_WEIGHT_MASTER_SCHEMA_VERSION = 'component-weight-master-v19';

function n(value) { const parsed = Number.parseFloat(String(value ?? '').replace(/[^\d.+-]/g, '')); return Number.isFinite(parsed) ? parsed : null; }
function s(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function sameSize(a, b) { const av = n(a); const bv = n(b); return av !== null && bv !== null && Math.abs(av - bv) <= Math.max(1.5, Math.abs(bv) * 0.006); }

export function normalizeLegacyWeightRow(row = {}, index = 0) {
  return {
    id: row.id || `LEGACY-WT-${index + 1}`,
    source: row.source || 'PCF_STUDIO_LEGACY_WTVALVEWEIGHTS_SEED',
    sourceRevision: row.sourceRevision || 'V19-SEED',
    dataStatus: row.dataStatus || 'SCREENING_SAMPLE',
    componentType: s(row.componentType ?? row.Type ?? 'COMPONENT').toUpperCase(),
    typeDesc: s(row.typeDesc ?? row.TypeDesc ?? ''),
    dn: n(row.dn ?? row.DN),
    nps: n(row.nps ?? row.NS),
    ratingClass: n(row.ratingClass ?? row.Rating) ?? 300,
    rfFaceToFace_mm: n(row.rfFaceToFace_mm ?? row['RF-F/F']),
    rtjFaceToFace_mm: n(row.rtjFaceToFace_mm ?? row['RTJ F/F']),
    bwFaceToFace_mm: n(row.bwFaceToFace_mm ?? row['BW-F/F']),
    rfRtjWeight_kg: n(row.rfRtjWeight_kg ?? row['RF/RTJ KG']),
    bwWeight_kg: n(row.bwWeight_kg ?? row['BW KG']),
    raw: row.raw || row,
  };
}

export const componentWeightMasterRows = legacyRows.map(normalizeLegacyWeightRow);
export function getComponentWeightMasterRows() { return [...getComponentWeightOverrideRows(), ...componentWeightMasterRows]; }

export function findComponentWeightCandidates({ componentType = 'VALVE', dn = null, nps = null, ratingClass = 300, typeDesc = '' } = {}) {
  const targetType = s(componentType).toUpperCase();
  const targetDesc = s(typeDesc).toLowerCase();
  const targetRating = n(ratingClass) ?? 300;
  return getComponentWeightMasterRows().filter((row) => {
    if (targetType && row.componentType !== targetType) return false;
    if (dn != null && !sameSize(row.dn, dn)) return false;
    if (nps != null && row.nps != null && !sameSize(row.nps, nps)) return false;
    if (n(row.ratingClass) !== targetRating) return false;
    if (targetDesc && row.typeDesc && !row.typeDesc.toLowerCase().includes(targetDesc)) return false;
    return true;
  });
}

function rowToValue(row, faceType = 'RF') {
  const face = s(faceType).toUpperCase();
  const length_mm = face === 'RTJ' ? (row.rtjFaceToFace_mm ?? row.rfFaceToFace_mm) : face === 'BW' ? (row.bwFaceToFace_mm ?? row.rfFaceToFace_mm) : row.rfFaceToFace_mm;
  const weight_kg = face === 'BW' ? (row.bwWeight_kg ?? row.rfRtjWeight_kg) : row.rfRtjWeight_kg;
  return { componentType: row.componentType, dn: row.dn, nps: row.nps, ratingClass: row.ratingClass, typeDesc: row.typeDesc, length_mm, weight_kg, faceType, source: row.source, sourceRevision: row.sourceRevision, dataStatus: row.dataStatus, rowId: row.id };
}

export function resolveComponentWeightFromMaster(input = {}) {
  const candidates = findComponentWeightCandidates(input);
  if (candidates.length === 1) {
    const row = candidates[0];
    const value = rowToValue(row, input.faceType || 'RF');
    return { isQualified: value.weight_kg != null || value.length_mm != null, status: row.dataStatus || 'PASSED', value, source: row.source, sourceRevision: row.sourceRevision, diagnostics: row.dataStatus === 'SCREENING_SAMPLE' ? [{ severity: 'warn', code: 'COMPONENT_WEIGHT_SCREENING_SAMPLE', message: 'Component weight/length is from screening seed master data.', data: { rowId: row.id } }] : [], row };
  }
  if (candidates.length > 1) return { isQualified: false, status: 'AMBIGUOUS_MATCH', value: null, source: 'component-weight-master', diagnostics: [{ severity: 'error', code: 'COMPONENT_WEIGHT_AMBIGUOUS', message: `Multiple component weight rows match DN${input.dn} CL${input.ratingClass}.`, data: { candidateIds: candidates.map((row) => row.id) } }], candidates };
  return { isQualified: false, status: 'MISSING_DATA', value: null, source: 'component-weight-master', diagnostics: [{ severity: 'error', code: 'COMPONENT_WEIGHT_MISSING', message: `No component weight row found for DN${input.dn} CL${input.ratingClass}.`, data: input }] };
}

export function resolveValveFromMaster(input = {}) { return resolveComponentWeightFromMaster({ ...input, componentType: 'VALVE', typeDesc: input.valveType || input.typeDesc || '' }); }
export function resolveFlangeFromMaster(input = {}) { return resolveComponentWeightFromMaster({ ...input, componentType: 'FLANGE', typeDesc: input.flangeType || input.typeDesc || '' }); }
