import React from 'react';
import { useAppStore } from '../store/appStore';
import { DEFAULT_ENGINEERING_SETTINGS, SETTINGS_GROUPS } from '../data/engineeringDefaults/defaults';

const fieldGroups = {
  'Project basis': ['projectUnitSystem'],
  'Unit system': ['defaultLengthUnit', 'defaultForceUnit', 'defaultStressUnit'],
  'Pipe database source': ['pipeDataSource'],
  'Material database source': ['materialDataSource'],
  'Rack defaults': ['rackFrictionFactor', 'rackSpacingMargin'],
  'Guided cantilever defaults': ['shortDropLimit_ft'],
  'MIST/nozzle data source': ['allowPlaceholderLoads'],
  'Report options': ['reportTimestampPolicy'],
  'Benchmark certification status': ['benchmarkCertificationRequired'],
};

const inputStyle = {
  background: '#0f172a',
  color: '#f8fafc',
  border: '1px solid #334155',
  borderRadius: 8,
  padding: 8,
};

function Field({ name, value, onChange }) {
  const isBoolean = typeof value === 'boolean';
  const isNumber = typeof value === 'number';
  const testId = `settings-field-${name}`;

  return (
    <label
      data-testid={`settings-field-label-${name}`}
      style={{ display: 'grid', gap: 6, color: '#cbd5e1', fontSize: 13 }}
    >
      <span>{name}</span>

      {isBoolean ? (
        <select
          data-testid={testId}
          value={String(value)}
          onChange={(event) => onChange(name, event.target.value === 'true')}
          style={inputStyle}
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      ) : (
        <input
          data-testid={testId}
          value={value}
          type={isNumber ? 'number' : 'text'}
          step="any"
          onChange={(event) => onChange(name, isNumber ? Number(event.target.value) : event.target.value)}
          style={inputStyle}
        />
      )}
    </label>
  );
}

// A more robust hash function to guarantee a difference when values change,
// since JSON.stringify length might stay the same (e.g. 3.0 -> 2.0).
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export const SettingsTab = () => {
  const engineeringDefaults = useAppStore((state) => state.engineeringDefaults) || DEFAULT_ENGINEERING_SETTINGS;
  const setEngineeringDefault = useAppStore((state) => state.setEngineeringDefault);
  const resultsStale = useAppStore((state) => state.resultsStale);

  const contractHash = `engineering-settings-v1-${simpleHash(JSON.stringify(engineeringDefaults))}`;

  return (
    <div
      data-testid="settings-tab"
      style={{ padding: 24, color: '#fff', overflow: 'auto', height: '100%' }}
    >
      <h2 style={{ marginTop: 0 }}>Settings / Defaults</h2>

      <p style={{ color: '#cbd5e1' }}>
        Changing settings marks current results stale/recalculation required.
      </p>

      <div
        data-testid="settings-contract-hash"
        style={{ color: '#94a3b8', fontSize: 12, marginBottom: 16 }}
      >
        Contract Hash: {contractHash}
      </div>

      {resultsStale && (
        <div
          data-testid="settings-results-stale-banner"
          style={{
            background: '#422006',
            border: '1px solid #f59e0b',
            color: '#fde68a',
            borderRadius: 10,
            padding: 12,
            marginBottom: 16,
          }}
        >
          Current results are stale. Recalculate before issuing a report.
        </div>
      )}

      <div style={{ display: 'grid', gap: 18 }}>
        {SETTINGS_GROUPS.map((group) => (
          <section
            key={group}
            data-testid={`settings-group-${group.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            style={{
              background: '#111827',
              border: '1px solid #334155',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <h3 style={{ marginTop: 0 }}>{group}</h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                gap: 12,
              }}
            >
              {(fieldGroups[group] || []).map((field) => (
                <Field
                  key={field}
                  name={field}
                  value={engineeringDefaults[field]}
                  onChange={setEngineeringDefault}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
