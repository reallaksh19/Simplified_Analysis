import {
  DEFAULT_PIPE_CLASS,
  applyPipeClassToSegment,
  getSegmentPipeClass,
  validateSegmentPipeProperties,
} from '../src/sketcher/pipeProperties/pipePropertyModel.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const segment = applyPipeClassToSegment({
  id: 'S001',
  startNode: 'N001',
  endNode: 'N002',
}, {
  ...DEFAULT_PIPE_CLASS,
  pipe: {
    ...DEFAULT_PIPE_CLASS.pipe,
    dn: 200,
    schedule: 'STD',
    material: 'A106-B',
    wall_mm: 8.18,
  },
  lineClass: {
    ratingClass: 150,
    faceType: 'RF',
    flangeType: 'WN',
    valveType: 'Flanged Swing check Valve',
  },
});

assert(segment.pipe.dn === 200, 'Segment should store pipe DN.');
assert(segment.lineClass.ratingClass === 150, 'Segment should store rating class.');
assert(segment.properties.ratingClass === 150, 'Compatibility ratingClass should be present.');

const recovered = getSegmentPipeClass(segment, DEFAULT_PIPE_CLASS);
assert(recovered.pipe.dn === 200, 'Recovered pipe class should preserve DN.');
assert(recovered.lineClass.faceType === 'RF', 'Recovered pipe class should preserve face type.');

const validation = validateSegmentPipeProperties(segment);
assert(validation.ok, 'Qualified segment should validate.');

console.log('V18D pipe property model behavior test passed.');
