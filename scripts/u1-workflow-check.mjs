import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function fail(message) {
  console.error(`U1 WORKFLOW CHECK FAIL: ${message}`);
  process.exit(1);
}

const app = read('src/App.jsx');
const calcExtended = read('src/calc-extended/components/CalcExtendedTab.jsx');

if (!app.includes("activeTab === 'home' || activeTab === 'viewer'")) {
  fail('App.jsx must render Viewer3DTab for both home and viewer tab ids.');
}
if (!app.includes('{isViewerTab && <Viewer3DTab />}')) {
  fail('App.jsx must use the isViewerTab guard when rendering Viewer3DTab.');
}

if (!calcExtended.includes("analysisPayload?.schemaVersion === 'simplified-2d-v1'")) {
  fail('CalcExtendedTab.jsx must detect simplified-2d analysis payloads.');
}
if (!calcExtended.includes("simplifiedGeometry?.schemaVersion === 'simplified-2d-v1'")) {
  fail('CalcExtendedTab.jsx must detect simplified-2d store geometry.');
}
if (!calcExtended.includes("setActiveSubTab('2d')")) {
  fail('CalcExtendedTab.jsx must force the 2D subtab for sketcher Analyze 2D workflow.');
}

console.log('U1 workflow check passed: viewer alias and Sketcher Analyze 2D subtab handoff are guarded.');
