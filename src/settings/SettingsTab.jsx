import React from 'react';
import { useAppStore } from '../store/appStore';
import { DEFAULT_ENGINEERING_SETTINGS, SETTINGS_GROUPS } from '../data/engineeringDefaults/defaults';

const fieldGroups = {
  'Project basis': ['projectUnitSystem'],
  'Unit system': ['defaultLengthUnit', 'defaultForceUnit', 'defaultStressUnit'],
  'Pipe database source': ['pipeDataSource'],
  'Material database source': ['materialDataSource'],
  'Rack defaults': ['rackFrictionFactor', 'rackSpacingMargin', 'rackDefaultSpacingFt', 'rackAnchorDistanceFt', 'rackAllowableStressPsi'],
  'Guided cantilever defaults': ['shortDropLimit_ft'],
  'Sketcher defaults': ['defaultDesignTemperature_F', 'defaultPipeBore_mm'],
  'Calc Extended defaults': ['defaultInstallTemperature_F', 'defaultPipeSize_in', 'defaultSchedule', 'defaultMaterial', 'extendedCorrosionAllowance_in', 'extendedMillTolerance_pct'],
  'GC3D defaults': ['gc3dGridSnap_mm', 'gc3dDeltaT_F', 'gc3dE_psi', 'gc3dAlpha_in_in_F', 'gc3dSc_psi', 'gc3dSh_psi', 'gc3dCycleFactor', 'gc3dSa_psi'],
  'MIST/nozzle data source': ['allowPlaceholderLoads'],
  'Report options': ['reportTimestampPolicy'],
  'Benchmark certification status': ['benchmarkCertificationRequired']
};

function Field({ name, value, onChange }) {
  const defaultValue = DEFAULT_ENGINEERING_SETTINGS[name];
  const isBoolean = typeof defaultValue === 'boolean';
  const isNumber = typeof defaultValue === 'number';
  return (
    <label style={{ display: 'grid', gap: 6, color: '#cbd5e1', fontSize: 13 }}>
      <span>{name}</span>
      {isBoolean ? (
        <select value={String(value)} onChange={(e) => onChange(name, e.target.value === 'true')} style={inputStyle}>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      ) : (
        <input value={value ?? ''} type={isNumber ? 'number' : 'text'} step="any" onChange={(e) => onChange(name, isNumber ? Number(e.target.value) : e.target.value)} style={inputStyle} />
      )}
    </label>
  );
}

const inputStyle = { background: '#0f172a', color: '#f8fafc', border: '1px solid #334155', borderRadius: 8, padding: 8 };

export const SettingsTab = () => {
  const engineeringDefaults = useAppStore((state) => state.engineeringDefaults) || DEFAULT_ENGINEERING_SETTINGS;
  const resolvedEngineeringSettings = useAppStore((state) => state.resolvedEngineeringSettings);
  const setEngineeringDefault = useAppStore((state) => state.setEngineeringDefault);
  const resultsStale = useAppStore((state) => state.resultsStale);

  return (
    <div style={{ padding: 24, color: '#fff', overflow: 'auto', height: '100%' }}>
      <h2 style={{ marginTop: 0 }}>Settings / Defaults</h2>
      <p style={{ color: '#cbd5e1' }}>Changing settings marks current results stale/recalculation required.</p>
      {resolvedEngineeringSettings?.settingsHash && (
        <div style={{ background: '#0f172a', border: '1px solid #334155', color: '#93c5fd', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13 }}>
          Resolved settings contract: <strong>{resolvedEngineeringSettings.settings.schemaVersion}</strong> · Hash: <code>{resolvedEngineeringSettings.settingsHash}</code>
        </div>
      )}
      {resultsStale && <div style={{ background: '#422006', border: '1px solid #f59e0b', color: '#fde68a', borderRadius: 10, padding: 12, marginBottom: 16 }}>Current results are stale. Recalculate before issuing a report.</div>}
      <div style={{ display: 'grid', gap: 18 }}>
        {SETTINGS_GROUPS.map((group) => (
          <section key={group} style={{ background: '#111827', border: '1px solid #334155', borderRadius: 12, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>{group}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
              {(fieldGroups[group] || []).map((field) => (
                <Field key={field} name={field} value={engineeringDefaults[field]} onChange={setEngineeringDefault} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
