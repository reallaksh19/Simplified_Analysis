import { solve3DForceActions } from '../src/core/solvers/forceActions/solve3DForceActions.js';
function assert(c,m){ if(!c) throw new Error(m); }
const result = solve3DForceActions({
  nodes: { A:{pos:[0,0,0], type:'anchor'}, B:{pos:[1000,0,0], type:'anchor'} },
  segments: [{ id:'S1', startNode:'A', endNode:'B', type:'PIPE', pipe:{dn:100, od_mm:114.3, wall_mm:6.02}, operating:{designPressure_barg:10, designTemperature_C:150}, calculationFlags:{restrainedAxial:true}, properties:{} }],
}, { supportLoadResult: { supportLoads: [{nodeId:'A', verticalLoad_N:1000}] } });
assert(result.pressureThrust.length === 1,'pressure thrust expected');
assert(result.supportFriction.length === 1,'support friction expected');
console.log('V18J2 force actions behavior test passed.');
