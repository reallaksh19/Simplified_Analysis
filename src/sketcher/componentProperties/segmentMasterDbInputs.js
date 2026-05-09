import { resolveFlangeValveFlangeInsertData } from './componentMasterResolver.js';
import { resolveReducerInsertData } from './b169FittingMasterResolver.js';

export const SEGMENT_MASTER_DB_INPUTS_SCHEMA_VERSION = 'segment-master-db-inputs-v19f';

function finite(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function text(value, fallback = '') {
  const s = String(value ?? '').trim();
  return s || fallback;
}

export function extractMasterDbInputFromSegment(segment = {}, overrides = {}) {
  const pipe = segment.pipe || {};
  const props = segment.properties || {};
  const lineClass = segment.lineClass || {};
  const dn = finite(overrides.dn ?? pipe.dn ?? props.bore ?? segment.bore, 200);
  const schedule = text(overrides.schedule ?? pipe.schedule ?? props.schedule, 'STD');

  return {
    segmentId: segment.id || null,
    dn,
    nps: finite(overrides.nps ?? pipe.nps ?? props.nps, null),
    schedule,
    ratingClass: finite(overrides.ratingClass ?? lineClass.ratingClass ?? props.ratingClass, 300),
    faceType: text(overrides.faceType ?? lineClass.faceType ?? props.faceType, 'RF'),
    flangeType: text(overrides.flangeType ?? lineClass.flangeType ?? props.flangeType, 'WN'),
    valveType: text(overrides.valveType ?? lineClass.valveType ?? props.valveType, 'Flanged Swing check Valve'),
    reducerType: text(overrides.reducerType, 'CONCENTRIC'),
    targetDn: finite(overrides.targetDn ?? (dn > 50 ? dn - 50 : dn), dn),
  };
}

export function buildFvfMasterDbInputFromSegment(segment = {}, overrides = {}) {
  const base = extractMasterDbInputFromSegment(segment, overrides);
  return {
    dn: base.dn,
    nps: base.nps,
    ratingClass: base.ratingClass,
    faceType: base.faceType,
    flangeType: base.flangeType,
    valveType: base.valveType,
  };
}

export function buildReducerMasterDbInputFromSegment(segment = {}, overrides = {}) {
  const base = extractMasterDbInputFromSegment(segment, overrides);
  return {
    fromDn: base.dn,
    toDn: base.targetDn,
    reducerType: base.reducerType,
    scheduleFrom: base.schedule,
    scheduleTo: overrides.scheduleTo || base.schedule,
  };
}

export function resolveFvfForSegment(segment = {}, overrides = {}) {
  const input = buildFvfMasterDbInputFromSegment(segment, overrides);
  const resolved = resolveFlangeValveFlangeInsertData(input);
  return {
    schemaVersion: SEGMENT_MASTER_DB_INPUTS_SCHEMA_VERSION,
    kind: 'FLANGE_VALVE_FLANGE',
    input,
    resolved,
    ok: resolved.totalLength_mm != null && resolved.valveFaceToFace_mm != null && resolved.flangeThickness_mm != null,
    diagnostics: resolved.diagnostics || [],
  };
}

export function resolveReducerForSegment(segment = {}, overrides = {}) {
  const input = buildReducerMasterDbInputFromSegment(segment, overrides);
  const resolved = resolveReducerInsertData(input);
  return {
    schemaVersion: SEGMENT_MASTER_DB_INPUTS_SCHEMA_VERSION,
    kind: 'REDUCER',
    input,
    resolved,
    ok: resolved.length_mm != null,
    diagnostics: resolved.diagnostics || [],
  };
}
