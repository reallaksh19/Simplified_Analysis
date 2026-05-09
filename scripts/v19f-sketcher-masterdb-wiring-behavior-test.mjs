import {
  extractMasterDbInputFromSegment,
  resolveFvfForSegment,
  resolveReducerForSegment,
} from '../src/sketcher/componentProperties/segmentMasterDbInputs.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const segment = {
  id: 'S-TEST',
  pipe: { dn: 200, schedule: 'STD' },
  lineClass: {
    ratingClass: 300,
    faceType: 'RF',
    flangeType: 'WN',
    valveType: 'Flanged Swing check Valve',
  },
  properties: { bore: 200, ratingClass: 300 },
};

const input = extractMasterDbInputFromSegment(segment);
assert(input.dn === 200, 'DN must be extracted from segment pipe data.');
assert(input.ratingClass === 300, 'Rating class must be extracted from segment line class.');
assert(input.faceType === 'RF', 'Face type must be extracted.');
assert(input.flangeType === 'WN', 'Flange type must be extracted.');
assert(input.valveType === 'Flanged Swing check Valve', 'Valve type must be extracted.');

const fvf = resolveFvfForSegment(segment);
assert(fvf.ok, 'FVF must resolve from Master DB.');
assert(fvf.resolved.valveFaceToFace_mm > 0, 'FVF must include valve face-to-face from Master DB.');
assert(fvf.resolved.flangeThickness_mm > 0, 'FVF must include flange thickness from Master DB.');
assert(fvf.resolved.totalLength_mm === fvf.resolved.valveFaceToFace_mm + 2 * fvf.resolved.flangeThickness_mm + 2 * fvf.resolved.gasketAllowance_mm, 'FVF total length formula mismatch.');
assert(fvf.resolved.totalWeight_kg === fvf.resolved.valveWeight_kg + 2 * fvf.resolved.flangeWeight_kg, 'FVF total weight formula mismatch.');

const reducer = resolveReducerForSegment(segment, { targetDn: 150 });
assert(reducer.ok, 'Reducer must resolve from B16.9 Master DB.');
assert(reducer.resolved.length_mm > 0, 'Reducer must include length from B16.9 Master DB.');
assert(reducer.resolved.fittingDimensionSource, 'Reducer must include source provenance.');

console.log('V19F 2D Sketcher Master DB wiring behavior test passed.');
