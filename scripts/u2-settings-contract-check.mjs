import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function fail(message) {
  console.error(`U2 SETTINGS CONTRACT CHECK FAIL: ${message}`);
  process.exit(1);
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

const defaults = read('src/data/engineeringDefaults/defaults.js');
const resolver = read('src/core/settings/resolveEngineeringSettings.js');
const appStore = read('src/store/appStore.js');
const settingsTab = read('src/settings/SettingsTab.jsx');
const extendedStore = read('src/calc-extended/store/useExtendedStore.js');
const dashboard = read('src/calc-extended/components/DashboardView.jsx');
const extendedSolver = read('src/calc-extended/solver/ExtendedSolver.js');
const sketcherStore = read('src/sketcher/SketcherStore.js');
const behaviorTest = read('scripts/u2-settings-behavior-test.mjs');

for (const key of [
  'defaultDesignTemperature_F',
  'defaultInstallTemperature_F',
  'defaultPipeSize_in',
  'defaultPipeBore_mm',
  'extendedCorrosionAllowance_in',
  'extendedMillTolerance_pct',
  'gc3dGridSnap_mm',
  'gc3dDeltaT_F'
]) {
  requireIncludes(defaults, key, `DEFAULT_ENGINEERING_SETTINGS must include ${key}.`);
}

requireIncludes(resolver, 'canonicalJson', 'Settings resolver must expose canonicalJson for deterministic hashing.');
requireIncludes(resolver, 'stableHash', 'Settings resolver must expose stableHash.');
requireIncludes(resolver, "schemaVersion: 'engineering-settings-v1'", 'Resolved settings must include schemaVersion engineering-settings-v1.');
requireIncludes(resolver, 'settingsHash', 'Resolved settings must return settingsHash.');
requireIncludes(resolver, 'deltaT_F', 'Resolved settings must derive deltaT_F.');
requireIncludes(resolver, 'calcExtendedUnitSystem', 'Resolved settings must derive calcExtendedUnitSystem.');

requireIncludes(appStore, 'resolvedEngineeringSettings', 'appStore must store resolvedEngineeringSettings.');
requireIncludes(appStore, 'getResolvedEngineeringSettings', 'appStore must expose getResolvedEngineeringSettings.');
requireIncludes(appStore, 'resolveEngineeringSettings({ engineeringDefaults })', 'appStore settings mutations must recalculate resolved settings.');

requireIncludes(settingsTab, 'resolvedEngineeringSettings.settingsHash', 'SettingsTab must display the resolved settings hash.');
requireIncludes(settingsTab, 'Calc Extended defaults', 'SettingsTab must expose Calc Extended defaults.');
requireIncludes(settingsTab, 'GC3D defaults', 'SettingsTab must expose GC3D defaults.');
requireIncludes(settingsTab, 'Sketcher defaults', 'SettingsTab must expose Sketcher defaults.');

requireIncludes(extendedStore, 'hydrateEngineeringSettings', 'Calc Extended store must support settings hydration.');
requireIncludes(extendedStore, 'applyResolvedSettingsToExtendedState', 'Calc Extended store must apply resolved settings.');
requireIncludes(extendedStore, 'engineeringSettingsHash', 'Calc Extended store must retain engineeringSettingsHash.');
requireIncludes(extendedStore, 'resolvedSettings.defaultDesignTemperature_F', 'Calc Extended defaults must be sourced from resolved settings.');

requireIncludes(dashboard, 'settingsHash', 'Dashboard must pass settingsHash into solver/result metadata.');
requireIncludes(dashboard, 'getResolvedEngineeringSettings', 'Dashboard must resolve settings at run time.');
requireIncludes(dashboard, 'hydrateEngineeringSettings', 'Dashboard must hydrate Calc Extended store when settings change.');

requireIncludes(extendedSolver, 'resolveShortDropLimitFt', 'ExtendedSolver must resolve configurable short-drop limit.');
requireIncludes(extendedSolver, 'shortDropLimit_ft', 'ExtendedSolver must expose shortDropLimit_ft in parsed results/meta.');
requireIncludes(extendedSolver, 'parseGeometry(nodes, segments, anchors.anchor1, anchors.anchor2, settings)', 'runExtendedSolver must pass resolved settings into parseGeometry.');

requireIncludes(sketcherStore, 'useAppStore', 'SketcherStore must read the global app settings store.');
requireIncludes(sketcherStore, 'sketcherDefaults', 'SketcherStore must centralize defaults from resolved engineering settings.');
requireIncludes(sketcherStore, 'defaultPipeBore_mm', 'SketcherStore must hydrate default pipe bore from settings.');
requireIncludes(sketcherStore, 'engineeringSettingsHash', 'SketcherStore must preserve the active settings hash.');

requireIncludes(behaviorTest, 'assertNotEqual(base.settingsHash, changed.settingsHash', 'U2 behavior test must prove settings hash changes.');
requireIncludes(behaviorTest, 'analyzeShortDropGeometry', 'U2 behavior test must exercise short-drop solver behavior.');
requireIncludes(behaviorTest, 'shortDropLimit_ft: 2.0', 'U2 behavior test must override shortDropLimit_ft.');

console.log('U2 settings contract check passed: deterministic settings resolver, app store, UI, Sketcher, Calc Extended, and behavior tests are guarded.');
