import { DEFAULT_ENGINEERING_SETTINGS } from '../../data/engineeringDefaults/defaults';

const NUMERIC_KEYS = new Set([
  'rackFrictionFactor',
  'rackSpacingMargin',
  'rackDefaultSpacingFt',
  'rackAnchorDistanceFt',
  'rackAllowableStressPsi',
  'shortDropLimit_ft',
  'defaultDesignTemperature_F',
  'defaultInstallTemperature_F',
  'defaultPipeSize_in',
  'defaultPipeBore_mm',
  'extendedCorrosionAllowance_in',
  'extendedMillTolerance_pct',
  'gc3dGridSnap_mm',
  'gc3dDeltaT_F',
  'gc3dE_psi',
  'gc3dAlpha_in_in_F',
  'gc3dSc_psi',
  'gc3dSh_psi',
  'gc3dCycleFactor',
  'gc3dSa_psi'
]);

function normalizeValue(key, value) {
  if (NUMERIC_KEYS.has(key)) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : DEFAULT_ENGINEERING_SETTINGS[key];
  }
  if (typeof DEFAULT_ENGINEERING_SETTINGS[key] === 'boolean') {
    if (typeof value === 'boolean') return value;
    return String(value).toLowerCase() === 'true';
  }
  return value ?? DEFAULT_ENGINEERING_SETTINGS[key];
}

export function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 'null';
    return Number(value.toPrecision(12)).toString();
  }
  return JSON.stringify(value);
}

export function stableHash(value) {
  const input = canonicalJson(value);
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function resolveEngineeringSettings({ engineeringDefaults = {}, moduleOverrides = {}, fixtureOverrides = {}, userOverrides = {} } = {}) {
  const merged = {
    ...DEFAULT_ENGINEERING_SETTINGS,
    ...(engineeringDefaults || {}),
    ...(moduleOverrides || {}),
    ...(fixtureOverrides || {}),
    ...(userOverrides || {})
  };

  const settings = Object.keys(DEFAULT_ENGINEERING_SETTINGS).sort().reduce((acc, key) => {
    acc[key] = normalizeValue(key, merged[key]);
    return acc;
  }, {});

  const deltaT_F = settings.defaultDesignTemperature_F - settings.defaultInstallTemperature_F;
  const calcExtendedUnitSystem = settings.projectUnitSystem === 'metric' ? 'Metric' : 'Imperial';
  const gc3dUnitSystem = settings.projectUnitSystem === 'metric' ? 'si' : 'imperial';

  const resolved = Object.freeze({
    ...settings,
    deltaT_F,
    calcExtendedUnitSystem,
    gc3dUnitSystem,
    schemaVersion: 'engineering-settings-v1'
  });

  return Object.freeze({
    settings: resolved,
    settingsHash: stableHash(resolved),
    diagnostics: []
  });
}
