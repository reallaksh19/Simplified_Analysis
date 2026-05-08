import React from 'react';

const styles = {
  container: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' },
  header: { fontSize: '14px', fontWeight: 'bold', color: '#94a3b8', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }
};

import { usePipeRackStore } from '../store/usePipeRackStore';
import { solvePipeRack } from '../solver/PipeRackSolver';

import { useExtendedStore } from '../../calc-extended/store/useExtendedStore';
import { useAppStore } from '../../store/appStore';
import { getUnitLabel, formatUnit, MetricToImperial } from '../../calc-extended/utils/units';

export default function RackInputsDock() {
  const { globalSettings, lines, updateGlobalSetting, updateLine, addLine, removeLine, setResults, toggleSectionCreator } = usePipeRackStore();
  const methodology = useExtendedStore(state => state.methodology);
  const globalInputs = useExtendedStore(state => state.inputs);
  const resolvedEngineeringSettings = useAppStore(state => state.resolvedEngineeringSettings);
  const unitSystem = resolvedEngineeringSettings?.settings?.calcExtendedUnitSystem || 'Imperial';

  const handleRun = () => {
    const res = solvePipeRack(lines, globalSettings, methodology, {
      ...globalInputs,
      settings: resolvedEngineeringSettings?.settings,
      settingsHash: resolvedEngineeringSettings?.settingsHash,
      defaultSpacingSource: globalSettings.defaultSpacingSource || 'engineering-settings-contract'
    });
    res.methodologyUsed = methodology === '2D_BUNDLE' ? 'SIMPLIFIED_RACK_METHOD' : 'KELLOGG_MIST';
    res.meta = { ...(res.meta || {}), settingsHash: resolvedEngineeringSettings?.settingsHash || null };
    setResults(res);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>Global Rack Parameters</div>
      {globalSettings.settingsHash && (
        <div data-testid="piperack-settings-hash" style={{ background: '#0f172a', border: '1px solid #2563eb', color: '#93c5fd', borderRadius: '6px', padding: '8px', fontSize: '11px', wordBreak: 'break-all' }}>
          settings: {globalSettings.settingsHash}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
        <span>Anchor Dist ({getUnitLabel(unitSystem, 'length')}):</span>
        <input type="number" style={{ width: '80px', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '2px' }}
               value={unitSystem === 'Imperial' ? globalSettings.anchorDistanceFt : formatUnit(unitSystem, 'length', globalSettings.anchorDistanceFt, 2)}
               onChange={e => updateGlobalSetting('anchorDistanceFt', unitSystem === 'Imperial' ? Number(e.target.value) : MetricToImperial.m_to_ft(Number(e.target.value)))} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
        <span>Spacing Step ({getUnitLabel(unitSystem, 'length')}):</span>
        <input type="number" style={{ width: '80px', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '2px' }}
               value={unitSystem === 'Imperial' ? globalSettings.defaultSpacingFt : formatUnit(unitSystem, 'length', globalSettings.defaultSpacingFt, 2)}
               onChange={e => updateGlobalSetting('defaultSpacingFt', unitSystem === 'Imperial' ? Number(e.target.value) : MetricToImperial.m_to_ft(Number(e.target.value)))} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
        <span>Allow Stress ({getUnitLabel(unitSystem, 'pressure')}):</span>
        <input type="number" style={{ width: '80px', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '2px' }}
               value={unitSystem === 'Imperial' ? globalSettings.allowableStressPsi : formatUnit(unitSystem, 'pressure', globalSettings.allowableStressPsi, 2)}
               onChange={e => updateGlobalSetting('allowableStressPsi', unitSystem === 'Imperial' ? Number(e.target.value) : MetricToImperial.MPa_to_psi(Number(e.target.value)))} />
      </div>

      <div style={{ ...styles.header, marginTop: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <span>Piping Lines ({lines.length})</span>
        <button onClick={addLine} style={{ background: '#38bdf8', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '0 8px' }}>+ Add</button>
      </div>

      {lines.map((line) => (
        <div key={line.id} style={{ background: '#1e293b', padding: '8px', borderRadius: '4px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: `4px solid ${line.color}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', color: '#e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="color" value={line.color || '#38bdf8'} onChange={(e) => updateLine(line.id, 'color', e.target.value)} style={{ width: '20px', height: '20px', padding: 0, border: 'none', cursor: 'pointer', background: 'transparent' }} />
                <span>Line {line.id}</span>
            </div>
            <button onClick={() => removeLine(line.id)} style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '14px' }}>X</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {/* Column 1 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Size (NPS):</span>
                <input type="number" style={{ width: '50px', background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '2px' }} value={line.sizeNps} onChange={e => updateLine(line.id, 'sizeNps', Number(e.target.value))} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Service:</span>
                <select style={{ width: '80px', background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '2px', fontSize: '10px' }} value={line.service} onChange={e => updateLine(line.id, 'service', e.target.value)}>
                  <option value="Process-Liquid">Proc-Liq</option>
                  <option value="Process-Gas">Proc-Gas</option>
                  <option value="Utilities">Utils</option>
                  <option value="Flare">Flare</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Material:</span>
                <select style={{ width: '80px', background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '2px', fontSize: '10px' }} value={line.material} onChange={e => updateLine(line.id, 'material', e.target.value)}>
                  <option value="Carbon Steel">CS</option>
                  <option value="Austenitic Stainless Steel 18 Cr 8 Ni">SS</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Temp ({getUnitLabel(unitSystem, 'temp')}):</span>
                <input type="number" style={{ width: '50px', background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '2px' }} value={unitSystem === 'Imperial' ? line.tOperate : formatUnit(unitSystem, 'temp', line.tOperate, 1)} onChange={e => updateLine(line.id, 'tOperate', unitSystem === 'Imperial' ? Number(e.target.value) : MetricToImperial.C_to_F(Number(e.target.value)))} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Insulation (mm):</span>
                <input type="number" style={{ width: '50px', background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '2px' }} value={line.insulationThk || 0} onChange={e => updateLine(line.id, 'insulationThk', Number(e.target.value))} />
              </div>
            </div>

            {/* Column 2 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Include Flange:</span>
                <input type="checkbox" style={{ cursor: 'pointer' }} checked={line.hasFlange !== false} onChange={e => updateLine(line.id, 'hasFlange', e.target.checked)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Guide (mm):</span>
                <input type="number" step="1" style={{ width: '50px', background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '2px' }} value={line.guide_mm || 50} onChange={(e) => updateLine(line.id, 'guide_mm', Number(e.target.value))} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <input type="checkbox" title="Stagger" checked={line.stagger !== false} onChange={(e) => updateLine(line.id, 'stagger', e.target.checked)} />
              </div>
            </div>
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
        <button onClick={() => toggleSectionCreator(true)} style={{ background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '4px', padding: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
          📐 DESIGN PIPE RACK SECTION
        </button>
        <button onClick={handleRun} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', padding: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
          RUN LOOP NESTING ►
        </button>
      </div>

    </div>
  );
}
