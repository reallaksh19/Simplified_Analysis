import {
  insertReducerOnSegment,
  insertFlangeValveFlangeOnSegment,
} from '../src/sketcher/commands/insertComponentCommands.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const nodes = {
  N001: { pos: [0, 0, 0], type: 'free' },
  N002: { pos: [1000, 0, 0], type: 'free' },
};

const segments = [
  {
    id: 'S001',
    startNode: 'N001',
    endNode: 'N002',
    type: 'PIPE',
    properties: { type: 'PIPE', bore: 200, material: 'A106-B' },
  },
];

const reducer = insertReducerOnSegment({
  nodes,
  segments,
  components: {},
  segmentId: 'S001',
  componentInput: {
    fromDn: 200,
    toDn: 150,
    length_mm: 152,
    weight_kg: 12,
  },
});

assert(reducer.ok, 'Reducer insert should succeed.');
assert(reducer.segments.length === 3, 'Reducer insert should split original segment into 3.');
assert(Object.keys(reducer.components).length === 1, 'Reducer component should be stored.');

const fvf = insertFlangeValveFlangeOnSegment({
  nodes,
  segments,
  components: {},
  segmentId: 'S001',
  componentInput: {
    dn: 200,
    rating: 'CL300',
    valveFaceToFace_mm: 381,
    flangeThickness_mm: 41.3,
    gasketAllowance_mm: 3,
    valveWeight_kg: 95,
    flangeWeight_kg: 28,
  },
});

assert(fvf.ok, 'FVF insert should succeed.');
assert(fvf.segments.length === 3, 'FVF insert should split original segment into 3.');
assert(Object.keys(fvf.components).length === 1, 'FVF component should be stored.');

console.log('V18F insert component commands behavior test passed.');
