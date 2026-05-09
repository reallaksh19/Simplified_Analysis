import { solveSupportLoads3D } from '../src/core/solvers/supportLoads/solveSupportLoads3D.js';
function assert(c,m){ if(!c) throw new Error(m); }
const result = solveSupportLoads3D({
  nodes: { A:{pos:[0,0,0], type:'anchor'}, B:{pos:[1000,0,0], type:'anchor'} },
  segments: [{ id:'S1', startNode:'A', endNode:'B', type:'PIPE', length_mm:1000, pipe:{dn:100, od_mm:114.3, wall_mm:6.02}, contents:{fluidDensity_kg_m3:1000, fillFraction:1}, insulation:{thickness_mm:0, density_kg_m3:120}, properties:{} }],
  supports: [],
});
assert(result.status === 'PASSED','support load should pass');
assert(result.summary.totalWeight_N > 0,'weight should be positive');
assert(result.supportLoads.length === 2,'two support loads expected');

const componentResult = solveSupportLoads3D({
  nodes: {
    A:{pos:[0,0,0], type:'anchor'},
    C1:{pos:[450,0,0], type:'valve'},
    C2:{pos:[550,0,0], type:'valve'},
    B:{pos:[1000,0,0], type:'anchor'},
  },
  segments: [
    { id:'S1', startNode:'A', endNode:'C1', type:'PIPE', length_mm:450, pipe:{dn:100, od_mm:114.3, wall_mm:6.02}, contents:{fluidDensity_kg_m3:0}, insulation:{thickness_mm:0}, properties:{} },
    { id:'CSEG1', startNode:'C1', endNode:'C2', type:'FLANGE_VALVE_FLANGE', componentId:'FVF1', componentData:{ id:'FVF1', weight_kg:100 } },
    { id:'S2', startNode:'C2', endNode:'B', type:'PIPE', length_mm:450, pipe:{dn:100, od_mm:114.3, wall_mm:6.02}, contents:{fluidDensity_kg_m3:0}, insulation:{thickness_mm:0}, properties:{} },
  ],
  supports: [],
});
assert(componentResult.componentLoads.length === 1, 'inline component load expected');
assert(componentResult.summary.unassignedWeight_N < 1e-9, 'inline component should distribute to nearest supports');

console.log('V18I support load behavior test passed.');
