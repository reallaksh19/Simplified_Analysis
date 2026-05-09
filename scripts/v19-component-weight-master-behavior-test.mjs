import { resolveFlangeValveFlangeData } from '../src/core/engineering-data/resolveComponentData.js';
function assert(c,m){ if(!c) throw new Error(m); }
const fvf = resolveFlangeValveFlangeData({ dn:200, ratingClass:300, valveType:'Flanged Swing check Valve', flangeType:'WN', faceType:'RF' });
assert(fvf.isQualified,'FVF should resolve from master seed');
assert(fvf.value.totalLength_mm > 0,'FVF length should be positive');
assert(fvf.value.totalWeight_kg > 0,'FVF weight should be positive');
console.log('V19 component weight master behavior test passed.');
