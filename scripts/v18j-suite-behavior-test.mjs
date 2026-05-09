import { buildGC3DPayloadFromCalculationModel } from '../src/3d-analysis/solverSuite/run3DSimplifiedCalculationSuite.js';
function assert(c,m){ if(!c) throw new Error(m); }
const payload = buildGC3DPayloadFromCalculationModel({
  nodes: { A:{pos:[0,0,0], type:'anchor'}, B:{pos:[1000,0,0], type:'anchor'} },
  segments: [{ id:'S1', startNode:'A', endNode:'B', type:'PIPE', length_mm:1000, pipe:{dn:100, od_mm:114.3, wall_mm:6.02}, properties:{} }],
});
assert(payload.segments.length === 1,'GC payload segment expected');
assert(payload.segments[0].length_in > 0,'length should convert to inches');
console.log('V18J suite behavior test passed.');
