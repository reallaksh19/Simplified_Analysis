export const mockData = {
  nodes: {
    'A': { pos: [0, 0, 0], type: 'anchor' },
    'B': { pos: [6000, 0, 0], type: 'elbow' },
    'C': { pos: [6000, 4000, 0], type: 'anchor' }
  },
  segments: [
    { start: 'A', end: 'B' },
    { start: 'B', end: 'C' }
  ]
};
