import React from 'react';
import { useAnalysisStore } from './AnalysisStore';

export const ConfigPanel = () => {
  const params = useAnalysisStore(s => s.params);
  const setParams = useAnalysisStore(s => s.setParams);
  const unitSystem = useAnalysisStore(s => s.unitSystem);
  const setUnitSystem = useAnalysisStore(s => s.setUnitSystem);

  const isSI = unitSystem === 'si';

  // Helper functions for two-way binding
  const handleTempChange = (e) => {
    let val = Number(e.target.value);
    if (isSI) val = val * 9/5; // roughly deltaC to deltaF (for delta T)
    setParams({ deltaT_F: val });
  };

  const handleStressChange = (e, paramKey) => {
    let val = Number(e.target.value);
    if (isSI) val = val / 0.00689476; // MPa to psi
    setParams({ [paramKey]: val });
  };

  const handleExpansionChange = (e) => {
    let val = Number(e.target.value);
    if (isSI) val = val / 1.8; // per C to per F
    setParams({ alpha_in_in_F: val });
  };

  const activeSolver = useAnalysisStore(s => s.activeSolver);
  const setActiveSolver = useAnalysisStore(s => s.setActiveSolver);

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#0f172a', color: '#f8fafc', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 16px 0' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Configuration</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Solver Methodology:</label>
            <select
              value={activeSolver}
              onChange={(e) => setActiveSolver(e.target.value)}
              style={{ padding: '4px 8px', background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}
            >
              <option value="GC3D">GC 3D (Native / Phase 1 Safe)</option>
            </select>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Legacy Fluor / 2D Bundle are routed through Calc Extended, not this 3D tab.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Unit System:</label>
          <select
            value={unitSystem}
            onChange={(e) => setUnitSystem(e.target.value)}
            style={{ padding: '4px 8px', background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}
          >
            <option value="imperial">Imperial (in, lbf, psi)</option>
            <option value="si">SI (mm, N, MPa)</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div style={{ background: '#1e293b', padding: '24px', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Process Parameters</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
              {`Change in Temperature, deltaT (${isSI ? 'Deg C' : 'Deg F'}):`}
              <input type="number" value={isSI ? Number((params.deltaT_F * 5/9).toFixed(1)) : params.deltaT_F} onChange={handleTempChange} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
              {`Young's Modulus (${isSI ? 'MPa' : 'psi'}):`}
              <input type="number" value={isSI ? Number((params.E_psi * 0.00689476).toFixed(0)) : params.E_psi} onChange={e => handleStressChange(e, 'E_psi')} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
              {`Thermal Expansion Coeff (${isSI ? 'mm/mm/°C' : 'in/in/°F'}):`}
              <input type="number" step="1e-7" value={isSI ? Number((params.alpha_in_in_F * 1.8).toExponential(3)) : params.alpha_in_in_F} onChange={handleExpansionChange} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
              {`Cold Allowable Stress (${isSI ? 'MPa' : 'psi'}):`}
              <input type="number" value={isSI ? Number((params.Sc_psi * 0.00689476).toFixed(0)) : params.Sc_psi} onChange={e => handleStressChange(e, 'Sc_psi')} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
              {`Hot Allowable Stress (${isSI ? 'MPa' : 'psi'}):`}
              <input type="number" value={isSI ? Number((params.Sh_psi * 0.00689476).toFixed(0)) : params.Sh_psi} onChange={e => handleStressChange(e, 'Sh_psi')} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
              Cycle Factor f:
              <input type="number" step="0.1" value={params.f} onChange={e => setParams({ f: Number(e.target.value) })} style={{ padding: '8px', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc' }} />
            </label>
            <div style={{ marginTop: '16px', fontWeight: 'bold', color: '#10b981' }}>
              {`Computed Allowable SA: ${isSI ? (params.Sa_psi * 0.00689476).toFixed(0) + ' MPa' : params.Sa_psi.toFixed(0) + ' psi'}`}
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};
