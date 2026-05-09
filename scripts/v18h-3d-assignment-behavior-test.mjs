import fs from 'node:fs';
function assert(c,m){ if(!c) throw new Error(m); }
const panel = fs.readFileSync('src/3d-analysis/CalculationAssignmentPanel.jsx','utf8');
assert(panel.includes('3d-segment-wall'),'wall input missing');
assert(panel.includes('3d-segment-design-temperature'),'temperature input missing');
assert(panel.includes('3d-segment-design-pressure'),'pressure input missing');
assert(panel.includes('3d-segment-fluid-density'),'fluid input missing');
console.log('V18H 3D assignment behavior test passed.');
