import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function fail(message) {
  console.error(`U1 WORKFLOW CHECK FAIL: ${message}`);
  process.exit(1);
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

const app = read('src/App.jsx');
const calcExtended = read('src/calc-extended/components/CalcExtendedTab.jsx');
const analysisStore = read('src/3d-analysis/AnalysisStore.js');

requireIncludes(
  app,
  "activeTab === 'home' || activeTab === 'viewer'",
  'App.jsx must render Viewer3DTab for both home and viewer tab ids.'
);
requireIncludes(
  app,
  '{isViewerTab && <Viewer3DTab />}',
  'App.jsx must use the isViewerTab guard when rendering Viewer3DTab.'
);

requireIncludes(
  calcExtended,
  "analysisPayload?.schemaVersion === 'simplified-2d-v1'",
  'CalcExtendedTab.jsx must detect simplified-2d analysis payloads.'
);
requireIncludes(
  calcExtended,
  "simplifiedGeometry?.schemaVersion === 'simplified-2d-v1'",
  'CalcExtendedTab.jsx must detect simplified-2d store geometry.'
);
requireIncludes(
  calcExtended,
  "setActiveSubTab('2d')",
  'CalcExtendedTab.jsx must force the 2D subtab for sketcher Analyze 2D workflow.'
);

requireIncludes(
  analysisStore,
  'UNSUPPORTED_GC3D_SKETCHER_NODE_TYPES',
  'AnalysisStore.js must define unsupported sketcher node types for GC3D preflight.'
);
requireIncludes(
  analysisStore,
  "new Set(['tee', 'branch', 'olet'])",
  'AnalysisStore.js must block tee/branch/olet sketcher node topology before GC3D.'
);
requireIncludes(
  analysisStore,
  'buildSketcherGC3DPreflight',
  'AnalysisStore.js must expose a Sketcher-to-GC3D preflight helper.'
);
requireIncludes(
  analysisStore,
  "status: 'UNSUPPORTED_GEOMETRY'",
  'AnalysisStore.js must return explicit UNSUPPORTED_GEOMETRY status for tee/branch/olet GC3D preflight failures.'
);
requireIncludes(
  analysisStore,
  'GC3D_PREFLIGHT',
  'AnalysisStore.js must write a GC3D_PREFLIGHT diagnostic when Sketcher geometry is not supported.'
);
requireIncludes(
  analysisStore,
  'return preflight;',
  'AnalysisStore.js importFromSketcher must return the failed preflight result instead of silently navigating.'
);

console.log('U1 workflow check passed: viewer alias, 2D handoff, and GC3D unsupported-topology preflight are guarded.');
