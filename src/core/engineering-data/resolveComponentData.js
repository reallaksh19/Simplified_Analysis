import { resolveValveFromMaster, resolveFlangeFromMaster } from '../../data/componentWeightMasterDb.js';
import { resolveFlangeDimensions } from '../../data/flangeDimensionalMasterDb.js';

function ratingString(value) { const n = Number(value); return Number.isFinite(n) ? `CL${n}` : String(value || 'CL300'); }
function sourceStatus(status) { return status === 'SCREENING_SAMPLE' ? 'SCREENING_SAMPLE' : status === 'USER_DEFINED' ? 'USER_DEFINED' : ['MISSING_DATA', 'AMBIGUOUS_MATCH'].includes(status) ? 'MISSING_COMPONENT_DATA' : 'VERIFIED'; }

export function resolveValveComponentData(input = {}) {
  const r = resolveValveFromMaster(input);
  return { isQualified: r.isQualified, status: r.status, sourceStatus: sourceStatus(r.status), value: r.value, source: r.source, sourceRevision: r.sourceRevision, diagnostics: r.diagnostics || [] };
}
export function resolveFlangeComponentData(input = {}) {
  const r = resolveFlangeFromMaster(input);
  return { isQualified: r.isQualified, status: r.status, sourceStatus: sourceStatus(r.status), value: r.value, source: r.source, sourceRevision: r.sourceRevision, diagnostics: r.diagnostics || [] };
}
export function resolveFlangeValveFlangeData({ dn, ratingClass = 300, valveType = 'Flanged Swing check Valve', flangeType = 'WN', faceType = 'RF' } = {}) {
  const valve = resolveValveFromMaster({ dn, ratingClass, valveType, faceType });
  const flangeWeight = resolveFlangeFromMaster({ dn, ratingClass, flangeType, faceType });
  const flangeDimensions = resolveFlangeDimensions({ dn, ratingClass, flangeType, faceType });
  const valveLength = valve.value?.length_mm;
  const valveWeight = valve.value?.weight_kg;
  const flangeWeightKg = flangeWeight.value?.weight_kg;
  const flangeThickness = flangeDimensions.value?.thickness_mm;
  const gasketAllowance = flangeDimensions.value?.gasketAllowance_mm ?? 0;
  const totalLength = valveLength != null && flangeThickness != null ? valveLength + 2 * flangeThickness + 2 * gasketAllowance : null;
  const totalWeight = valveWeight != null && flangeWeightKg != null ? valveWeight + 2 * flangeWeightKg : null;
  const diagnostics = [...(valve.diagnostics || []), ...(flangeWeight.diagnostics || []), ...(flangeDimensions.diagnostics || [])];
  return {
    isQualified: valve.isQualified && flangeDimensions.isQualified && totalLength != null,
    status: totalLength != null ? 'SCREENING_SAMPLE' : 'MISSING_DATA',
    sourceStatus: totalLength != null ? 'SCREENING_SAMPLE' : 'MISSING_COMPONENT_DATA',
    value: { dn, rating: ratingString(ratingClass), ratingClass, valveType, flangeType, faceType, valveFaceToFace_mm: valveLength, flangeThickness_mm: flangeThickness, gasketAllowance_mm: gasketAllowance, valveWeight_kg: valveWeight, flangeWeight_kg: flangeWeightKg, totalLength_mm: totalLength, totalWeight_kg: totalWeight, flangeDimensionSource: flangeDimensions.source, flangeDimensionSourceRevision: flangeDimensions.sourceRevision, flangeDimensionStatus: flangeDimensions.status },
    diagnostics,
    trace: ['component-weight-master', 'flange-dimensional-master'],
  };
}
