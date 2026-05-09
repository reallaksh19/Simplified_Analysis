import { build3DCalculationModelFromSketcher, validate3DCalculationModel } from '../src/sketcher/adapters/sketcherTo3DCalculationModel.js';
function assert(c,m){ if(!c) throw new Error(m); }
const model = build3DCalculationModelFromSketcher({
  nodes: { A:{pos:[0,0,0], type:'anchor'}, B:{pos:[1000,0,0], type:'anchor'} },
  segments: [{ id:'S1', startNode:'A', endNode:'B', type:'PIPE', pipe:{dn:100, wall_mm:6}, lineClass:{ratingClass:300} }],
  components: {},
});
assert(model.schemaVersion === 'sketcher-to-3d-calculation-model-v18g','schema mismatch');
assert(model.segments.length === 1,'segment expected');
assert(model.segments[0].lineClass.ratingClass === 300,'lineClass must pass through');
assert(validate3DCalculationModel(model).ok,'model should validate');
console.log('V18G sketcher-to-3D behavior test passed.');
