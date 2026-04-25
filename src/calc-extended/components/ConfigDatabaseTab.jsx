import React, { useState } from 'react';
import { useExtendedStore } from '../store/useExtendedStore';

// Import JSON DBs
import expansionCoeffs from '../db/expansion_coefficients.json';
import modulusElasticity from '../db/modulus_elasticity.json';
import pipeProps from '../db/pipe_properties.json';
import flangeRatings from '../db/flange_ratings.json';
import designStress from '../db/design_stress.json';

const thStyle = { background: '#1e293b', padding: '8px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', borderBottom: '1px solid #334155' };
const tdStyle = { padding: '8px', borderBottom: '1px solid #1e293b', fontSize: '12px', color: '#cbd5e1' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '12px', background: '#0f172a', borderRadius: '8px', overflow: 'hidden' };

export default function ConfigDatabaseTab() {
  const { unitSystem, toggleUnitSystem } = useExtendedStore();
  const [activeDb, setActiveDb] = useState('pipe_properties');

  return (
    <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>

      <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
        <h2 style={{ fontSize: '16px', color: '#f8fafc', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>Global Configuration</h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#94a3b8' }}>Unit System:</span>
          <select
            value={unitSystem}
            onChange={e => toggleUnitSystem(e.target.value)}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '6px 12px', borderRadius: '4px' }}
          >
            <option value="Imperial">Imperial (in, lbs, PSI, °F)</option>
            <option value="Metric">Metric (mm, N, MPa, °C)</option>
          </select>
          <span style={{ color: '#f59e0b', fontSize: '12px' }}>
            Note: The solver engine inherently calculates in Imperial. Setting to Metric uses pre/post processors.
          </span>
        </div>
      </div>

      <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '16px', color: '#f8fafc', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>Database Viewer</h2>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {['pipe_properties', 'expansion_coefficients', 'modulus_elasticity', 'flange_ratings', 'design_stress'].map(db => (
            <button
              key={db}
              onClick={() => setActiveDb(db)}
              style={{
                background: activeDb === db ? '#3b82f6' : '#1e293b',
                color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
              }}
            >
              {db}.json
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #1e293b', borderRadius: '8px', background: '#020617', padding: '12px' }}>
          {activeDb === 'pipe_properties' && (
            <table style={tableStyle}>
              <thead><tr><th style={thStyle}>NPS</th><th style={thStyle}>Schedule</th><th style={thStyle}>OD (in)</th><th style={thStyle}>Thickness (in)</th><th style={thStyle}>Area (sq in)</th><th style={thStyle}>Moment of Inertia (in^4)</th></tr></thead>
              <tbody>{pipeProps.map((p, i) => <tr key={i}><td style={tdStyle}>{p.nominal_size}</td><td style={tdStyle}>{p.schedule}</td><td style={tdStyle}>{p.OD.toFixed(3)}</td><td style={tdStyle}>{p.t.toFixed(3)}</td><td style={tdStyle}>{p.Am.toFixed(2)}</td><td style={tdStyle}>{p.I.toFixed(2)}</td></tr>)}</tbody>
            </table>
          )}

          {activeDb === 'expansion_coefficients' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {expansionCoeffs.map(mat => (
                <div key={mat.material}>
                  <div style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>{mat.material}</div>
                  <table style={tableStyle}>
                    <thead><tr><th style={thStyle}>Temp (°F)</th><th style={thStyle}>Expansion (in/100ft)</th></tr></thead>
                    <tbody>{mat.data.map((d, i) => <tr key={i}><td style={tdStyle}>{d.temp_F}</td><td style={tdStyle}>{d.expansion_in_per_100ft.toFixed(2)}</td></tr>)}</tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {activeDb === 'modulus_elasticity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {modulusElasticity.map(mat => (
                <div key={mat.material}>
                  <div style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>{mat.material}</div>
                  <table style={tableStyle}>
                    <thead><tr><th style={thStyle}>Temp (°F)</th><th style={thStyle}>Modulus (ksi)</th></tr></thead>
                    <tbody>{mat.data.map((d, i) => <tr key={i}><td style={tdStyle}>{d.temp_F}</td><td style={tdStyle}>{d.modulus_ksi.toFixed(1)}</td></tr>)}</tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {activeDb === 'flange_ratings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {flangeRatings.map(group => (
                <div key={group.material_group}>
                  <div style={{ color: '#a78bfa', fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>{group.material_group}</div>
                  {group.data.map(cl => (
                    <div key={cl.class} style={{ marginTop: '12px', marginLeft: '12px' }}>
                      <div style={{ color: '#cbd5e1', fontSize: '13px' }}>Class {cl.class}#</div>
                      <table style={{...tableStyle, width: '50%'}}>
                        <thead><tr><th style={thStyle}>Temp (°F)</th><th style={thStyle}>Max Pressure (PSI)</th></tr></thead>
                        <tbody>{cl.ratings.map((r, i) => <tr key={i}><td style={tdStyle}>{r.temp_F}</td><td style={tdStyle}>{r.psi}</td></tr>)}</tbody>
                      </table>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {activeDb === 'design_stress' && (
             <table style={tableStyle}>
               <thead><tr><th style={thStyle}>Material</th><th style={thStyle}>Allowable Stress 'f' (PSI)</th></tr></thead>
               <tbody>{designStress.map((s, i) => <tr key={i}><td style={tdStyle}>{s.material}</td><td style={tdStyle}>{s.f_psi}</td></tr>)}</tbody>
             </table>
          )}
        </div>
      </div>

    </div>
  );
}
