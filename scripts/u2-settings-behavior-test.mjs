import { resolveEngineeringSettings } from '../src/core/settings/resolveEngineeringSettings.js';
import { analyzeShortDropGeometry } from '../src/calc-extended/solver/ExtendedSolver.js';

function fail(message) {
  console.error(`U2 SETTINGS BEHAVIOR TEST FAIL: ${message}`);
  process.exit(1);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(`${message}. Expected ${expected}, got ${actual}.`);
  }
}

function assertNotEqual(actual, expected, message) {
  if (actual === expected) {
    fail(`${message}. Both values were ${actual}.`);
  }
}

const base = resolveEngineeringSettings();
const changed = resolveEngineeringSettings({ userOverrides: { shortDropLimit_ft: 2.0, defaultDesignTemperature_F: 500 } });

assertEqual(base.settings.schemaVersion, 'engineering-settings-v1', 'Resolver schema version mismatch');
assertNotEqual(base.settingsHash, changed.settingsHash, 'Settings hash must change when engineering defaults change');
assertEqual(base.settings.deltaT_F, 380, 'Default deltaT_F must be design minus install temperature');
assertEqual(changed.settings.deltaT_F, 430, 'Overridden deltaT_F must be design minus install temperature');

const nodes = [
  { id: 'A1', x: 0, y: 0, z: 0 },
  { id: 'N1', x: 10, y: 0, z: 0 },
  { id: 'N2', x: 10, y: 0, z: 2.5 },
  { id: 'A2', x: 40, y: 0, z: 2.5 }
];
const segments = [
  { id: 'S1', startNodeId: 'A1', endNodeId: 'N1' },
  { id: 'S2', startNodeId: 'N1', endNodeId: 'N2' },
  { id: 'S3', startNodeId: 'N2', endNodeId: 'A2' }
];

const defaultLimit = analyzeShortDropGeometry({ nodes, segments, settings: base.settings });
assertEqual(defaultLimit.results.shortDropLimit_ft, 3, 'Default short-drop limit should be 3 ft');
assertEqual(defaultLimit.results.shortDropsIgnored, 1, '2.5 ft vertical drop should be ignored with 3 ft limit');
assertEqual(defaultLimit.results.bX, 0, 'Ignored short drop must not contribute to X absorbing leg');

const lowerLimit = analyzeShortDropGeometry({ nodes, segments, settings: changed.settings });
assertEqual(lowerLimit.results.shortDropLimit_ft, 2, 'Overridden short-drop limit should be 2 ft');
assertEqual(lowerLimit.results.shortDropsIgnored, 0, '2.5 ft vertical drop should be retained with 2 ft limit');
assertEqual(lowerLimit.results.bX, 2.5, 'Retained short drop must contribute to X absorbing leg');

console.log('U2 settings behavior test passed: resolved settings hash changes and short-drop setting changes solver behavior.');
