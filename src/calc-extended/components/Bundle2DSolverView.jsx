import React, { useState } from 'react';
import { useExtendedStore } from '../store/useExtendedStore';
import { runExtendedSolver } from '../solver/ExtendedSolver'; // Reuse the pure function by mocking an equivalent 3D payload
import { getUnitLabel, formatUnit, MetricToImperial } from '../utils/units';

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100%', width: '100%', backgroundColor: '#020617', color: '#e2e8f0', overflow: 'hidden' },
  overlay: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', flexDirection: 'column', gap: 12, fontSize: 14 },
  row: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px', alignItems: 'center' },
  input: { width: '80px', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '4px', borderRadius: '4px' },
  statusBadge: (pass) => ({ background: pass ? '#064e3b' : '#7f1d1d', color: pass ? '#34d399' : '#fca5a5', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' })
};

// Interactive foreignObject input component overlaying the SVG
const EditableText = ({ x, y, valueKey, label, inputs, onUpdate, align="middle", width=40 }) => {
  // shift foreignObject up/left to center the HTML input exactly where the SVG text would be
  const xOffset = align === 'middle' ? width/2 : (align === 'end' ? width : 0);
  return (
    <foreignObject x={x - xOffset} y={y - 6} width={width} height="16" style={{ overflow: 'visible' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: align === 'middle' ? 'center' : (align==='end' ? 'flex-end' : 'flex-start') }}>
        <span style={{ fontSize: '8px', color: '#94a3b8', marginRight: '2px' }}>{label}</span>
        <style>{`
          .hide-spinners::-webkit-inner-spin-button, .hide-spinners::-webkit-outer-spin-button {
            -webkit-appearance: none; margin: 0;
          }
          .hide-spinners { -moz-appearance: textfield; }
        `}</style>
        <input
          type="number"
          className="hide-spinners"
          value={inputs[valueKey]}
          onChange={(e) => onUpdate(valueKey, e.target.value)}
          style={{
            width: '28px', background: 'rgba(15,23,42,0.8)', border: '1px solid #3b82f6',
            color: '#fff', fontSize: '8px', padding: '1px', borderRadius: '2px', textAlign: 'center',
            outline: 'none'
          }}
        />
      </div>
    </foreignObject>
  );
};

// 2D SVG Schematic Renderer
const Schematic2D = ({ shape, inputs, onUpdate }) => {
  const c = '#38bdf8'; // pipe color

  if (shape === 'L-Shape') {
    // Dynamic scaling logic
    const totalW = Math.max(inputs.Vx, 1);
    const totalH = Math.max(inputs.Vy, 1);
    const maxDim = Math.max(totalW, totalH);
    const scale = 80 / maxDim;
    const w = totalW * scale;
    const h = totalH * scale;

    return (
      <svg width="300" height="300" viewBox="-10 0 110 100" stroke={c} strokeWidth="2" fill="none" style={{overflow: 'visible'}}>
        <path d={`M 20,80 L 20,${80 - h} L ${20 + w},${80 - h}`} />
        <circle cx="20" cy="80" r="4" fill="#ef4444" stroke="none" />
        <circle cx={20 + w} cy={80 - h} r="4" fill="#f59e0b" stroke="none" />
        <EditableText x={20 + w/2} y={80 - h - 5} valueKey="Vx" label="Vx" inputs={inputs} onUpdate={onUpdate} />
        <EditableText x={15} y={80 - h/2} valueKey="Vy" label="Vy" align="end" inputs={inputs} onUpdate={onUpdate} />
      </svg>
    );
  }
  if (shape === 'Z-Shape') {
    const totalW = Math.max(inputs.Vx1 + inputs.Vx2, 1);
    const totalH = Math.max(inputs.Vy, 1);
    const maxDim = Math.max(totalW, totalH);
    const scale = 80 / maxDim;
    const w1 = inputs.Vx1 * scale;
    const w2 = inputs.Vx2 * scale;
    const h = totalH * scale;

    return (
      <svg width="300" height="300" viewBox="-10 0 110 100" stroke={c} strokeWidth="2" fill="none" style={{overflow: 'visible'}}>
        <path d={`M 10,80 L ${10 + w1},80 L ${10 + w1},${80 - h} L ${10 + w1 + w2},${80 - h}`} />
        <circle cx="10" cy="80" r="4" fill="#ef4444" stroke="none" />
        <circle cx={10 + w1 + w2} cy={80 - h} r="4" fill="#f59e0b" stroke="none" />
        <EditableText x={10 + w1/2} y={85} valueKey="Vx1" label="Vx1" inputs={inputs} onUpdate={onUpdate} />
        <EditableText x={5 + w1} y={80 - h/2} valueKey="Vy" label="Vy" align="end" inputs={inputs} onUpdate={onUpdate} />
        <EditableText x={10 + w1 + w2/2} y={80 - h - 5} valueKey="Vx2" label="Vx2" inputs={inputs} onUpdate={onUpdate} />
      </svg>
    );
  }
  if (shape === 'U-Loop') {
    const totalW = Math.max(inputs.L + inputs.W, 1);
    const totalH = Math.max(inputs.H, 1);
    const maxDim = Math.max(totalW, totalH);
    const scale = 80 / maxDim;
    const l1 = (inputs.L / 2) * scale;
    const w = inputs.W * scale;
    const h = totalH * scale;

    return (
      <svg width="300" height="300" viewBox="-10 0 110 100" stroke={c} strokeWidth="2" fill="none" style={{overflow: 'visible'}}>
        <path d={`M 10,80 L ${10 + l1},80 L ${10 + l1},${80 - h} L ${10 + l1 + w},${80 - h} L ${10 + l1 + w},80 L ${10 + l1 * 2 + w},80`} />
        <circle cx="10" cy="80" r="4" fill="#ef4444" stroke="none" />
        <circle cx={10 + l1 * 2 + w} cy="80" r="4" fill="#f59e0b" stroke="none" />
        <EditableText x={10 + l1 + w/2} y={85} valueKey="L" label="L" inputs={inputs} onUpdate={onUpdate} />
        <EditableText x={10 + l1 + w/2} y={80 - h - 5} valueKey="W" label="W" inputs={inputs} onUpdate={onUpdate} />
        <EditableText x={5 + l1} y={80 - h/2} valueKey="H" label="H" align="end" inputs={inputs} onUpdate={onUpdate} />
      </svg>
    );
  }
  return null;
};

export default function Bundle2DSolverView() {
  const { unitSystem, methodology, inputs: globalInputs } = useExtendedStore();
  const [shape, setShape] = useState('L-Shape');
  // Default values assumed in Imperial (ft). We'll treat UI values as current unit system.
  const [geom, setGeom] = useState({ Vx: 25, Vy: 16.5, Vx1: 15, Vx2: 10, L: 100, W: 10, H: 10 });
  const [results, setResults] = useState(null);

  const updateGeom = (k, v) => setGeom(s => ({...s, [k]: Number(v)}));

  const handleRun = () => {
    // PRE-PROCESSOR: Convert UI geometric values down to engine Imperial if currently Metric
    const engineGeom = { ...geom };
    if (unitSystem === 'Metric') {
      // 2D UI operates in meters if metric, ft if imperial.
      // Our existing pre-processor `MetricToImperial.m_to_ft` does this.
      Object.keys(engineGeom).forEach(k => {
        engineGeom[k] = MetricToImperial.m_to_ft(geom[k]);
      });
    }

    // Translate the 2D geometric inputs into the standard nodes/segments payload for ExtendedSolver
    let nodes = [];
    let segments = [];
    let anchors = { anchor1: 'n1' };

    if (shape === 'L-Shape') {
      nodes = [
        { id: 'n1', x: 0, y: 0, z: 0 },
        { id: 'n2', x: engineGeom.Vx, y: 0, z: 0 },
        { id: 'n3', x: engineGeom.Vx, y: engineGeom.Vy, z: 0 }
      ];
      segments = [
        { id: 's1', startNodeId: 'n1', endNodeId: 'n2' },
        { id: 's2', startNodeId: 'n2', endNodeId: 'n3' }
      ];
      anchors.anchor2 = 'n3';
    } else if (shape === 'Z-Shape') {
      nodes = [
        { id: 'n1', x: 0, y: 0, z: 0 },
        { id: 'n2', x: engineGeom.Vx1, y: 0, z: 0 },
        { id: 'n3', x: engineGeom.Vx1, y: engineGeom.Vy, z: 0 },
        { id: 'n4', x: engineGeom.Vx1 + engineGeom.Vx2, y: engineGeom.Vy, z: 0 }
      ];
      segments = [
        { id: 's1', startNodeId: 'n1', endNodeId: 'n2' },
        { id: 's2', startNodeId: 'n2', endNodeId: 'n3' },
        { id: 's3', startNodeId: 'n3', endNodeId: 'n4' }
      ];
      anchors.anchor2 = 'n4';
    } else if (shape === 'U-Loop') {
      const halfL = engineGeom.L / 2;
      nodes = [
        { id: 'n1', x: 0, y: 0, z: 0 },
        { id: 'n2', x: halfL, y: 0, z: 0 },
        { id: 'n3', x: halfL, y: engineGeom.H, z: 0 },
        { id: 'n4', x: halfL + engineGeom.W, y: engineGeom.H, z: 0 },
        { id: 'n5', x: halfL + engineGeom.W, y: 0, z: 0 },
        { id: 'n6', x: engineGeom.L + engineGeom.W, y: 0, z: 0 } // To ensure net distance is L (assuming W absorbs)
      ];
      segments = [
        { id: 's1', startNodeId: 'n1', endNodeId: 'n2' },
        { id: 's2', startNodeId: 'n2', endNodeId: 'n3' },
        { id: 's3', startNodeId: 'n3', endNodeId: 'n4' },
        { id: 's4', startNodeId: 'n4', endNodeId: 'n5' },
        { id: 's5', startNodeId: 'n5', endNodeId: 'n6' }
      ];
      anchors.anchor2 = 'n6';
    }

    // Pre-process global inputs if metric
    const engineInputs = { ...globalInputs };
    if (unitSystem === 'Metric') {
      engineInputs.tOperate = MetricToImperial.C_to_F(globalInputs.tOperate);
      engineInputs.corrosionAllowance = MetricToImperial.mm_to_in(globalInputs.corrosionAllowance);
    }

    // Mock an empty vessel so it skips MIST. Pass down methodology to trigger friction logic.
    const payload = {
      nodes, segments, anchors, inputs: engineInputs, boundaryMovement: {x:0, y:0, z:0},
      constraints: { maxStress: 20000 }, vessel: { vesselOD: 0, vesselThk: 0, nozzleRad: 0, designPress: 0, flangeClass: 150, momentArm: 0 },
      methodology
    };

    // Evaluate using the core mathematical engine
    const res = runExtendedSolver(payload);

    // Tag the result with the active methodology so the UI can reflect the user's choice
    res.meta.methodologyUsed = methodology === '2D_BUNDLE' ? 'SIMPLIFIED_2D_METHOD' : 'FLUOR_GUIDED_CANTILEVER';

    setResults(res);
  };

  return (
    <div style={styles.container}>
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
           {/* Left dock */}
           <div style={{ width: '360px', borderRight: '1px solid #1e293b', background: '#0f172a', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#94a3b8', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>2D Loop Parameters</div>
              <div style={styles.row}>
                <span>Profile Shape:</span>
                <select style={{...styles.input, width: '120px'}} value={shape} onChange={e => {setShape(e.target.value); setResults(null);}}>
                  <option>L-Shape</option>
                  <option>Z-Shape</option>
                  <option>U-Loop</option>
                </select>
              </div>

              <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '12px', color: '#38bdf8', marginBottom: '8px', fontWeight: 'bold' }}>Geometry ({getUnitLabel(unitSystem, 'length')})</div>
                {shape === 'L-Shape' && (
                  <>
                    <div style={styles.row}><span>Leg X (Vx):</span> <input type="number" style={styles.input} value={geom.Vx} onChange={e => updateGeom('Vx', e.target.value)} /></div>
                    <div style={styles.row}><span>Leg Y (Vy):</span> <input type="number" style={styles.input} value={geom.Vy} onChange={e => updateGeom('Vy', e.target.value)} /></div>
                  </>
                )}
                {shape === 'Z-Shape' && (
                  <>
                    <div style={styles.row}><span>Leg X1 (Vx1):</span> <input type="number" style={styles.input} value={geom.Vx1} onChange={e => updateGeom('Vx1', e.target.value)} /></div>
                    <div style={styles.row}><span>Leg X2 (Vx2):</span> <input type="number" style={styles.input} value={geom.Vx2} onChange={e => updateGeom('Vx2', e.target.value)} /></div>
                    <div style={styles.row}><span>Offset Leg (Vy):</span> <input type="number" style={styles.input} value={geom.Vy} onChange={e => updateGeom('Vy', e.target.value)} /></div>
                  </>
                )}
                {shape === 'U-Loop' && (
                  <>
                    <div style={styles.row}><span>Anchor Dist (L):</span> <input type="number" style={styles.input} value={geom.L} onChange={e => updateGeom('L', e.target.value)} /></div>
                    <div style={styles.row}><span>Loop Height (H):</span> <input type="number" style={styles.input} value={geom.H} onChange={e => updateGeom('H', e.target.value)} /></div>
                    <div style={styles.row}><span>Loop Width (W):</span> <input type="number" style={styles.input} value={geom.W} onChange={e => updateGeom('W', e.target.value)} /></div>
                  </>
                )}
              </div>

              <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155' }}>
                 <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', fontWeight: 'bold' }}>Piping Spec (Global)</div>
                 <div style={styles.row}>
                   <span>Material:</span>
                   <select style={styles.input} value={globalInputs.material} onChange={e => useExtendedStore.getState().updateInput('material', e.target.value)}>
                     <option>Carbon Steel</option>
                     <option>Austenitic Stainless Steel 18 Cr 8 Ni</option>
                   </select>
                 </div>
                 <div style={styles.row}>
                   <span>Size (in - Nominal):</span>
                   <input type="number" style={styles.input} value={globalInputs.pipeSize} onChange={e => useExtendedStore.getState().updateInput('pipeSize', Number(e.target.value))} />
                 </div>
                 <div style={styles.row}>
                   <span>Schedule:</span>
                   <select style={styles.input} value={globalInputs.schedule} onChange={e => useExtendedStore.getState().updateInput('schedule', e.target.value)}>
                     <option>40</option>
                     <option>80</option>
                   </select>
                 </div>
                 <div style={styles.row}>
                   <span>Temp ({getUnitLabel(unitSystem, 'temp')}):</span>
                   <input type="number" style={styles.input} value={globalInputs.tOperate} onChange={e => useExtendedStore.getState().updateInput('tOperate', Number(e.target.value))} />
                 </div>
              </div>

              <button onClick={handleRun} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', padding: '12px', fontWeight: 'bold', cursor: 'pointer', marginTop: 'auto' }}>
                EVALUATE 2D PROFILE ►
              </button>
           </div>

           {/* Right viewport */}
           <div style={{ flex: 1, background: '#020617', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #1e293b' }}>
                 <Schematic2D shape={shape} inputs={geom} onUpdate={updateGeom} />
              </div>

              {results && (
                <div style={{ padding: '24px', minHeight: '300px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
                    Evaluation Results
                    <span style={{ marginLeft: '12px', color: '#10b981', fontSize: '12px' }}>— Method: {results.meta.methodologyUsed}</span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', background: '#0f172a', borderRadius: '8px', overflow: 'hidden' }}>
                    <thead>
                      <tr>
                        <th style={{ background: '#1e293b', padding: '12px', textAlign: 'left', fontSize: '12px', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Axis</th>
                        <th style={{ background: '#1e293b', padding: '12px', textAlign: 'left', fontSize: '12px', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Expansion ({getUnitLabel(unitSystem, 'shortLength')})</th>
                        <th style={{ background: '#1e293b', padding: '12px', textAlign: 'left', fontSize: '12px', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Bending Leg ({getUnitLabel(unitSystem, 'length')})</th>
                        <th style={{ background: '#1e293b', padding: '12px', textAlign: 'left', fontSize: '12px', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Force ({getUnitLabel(unitSystem, 'force')})</th>
                        <th style={{ background: '#1e293b', padding: '12px', textAlign: 'left', fontSize: '12px', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Stress ({getUnitLabel(unitSystem, 'pressure')})</th>
                        <th style={{ background: '#1e293b', padding: '12px', textAlign: 'left', fontSize: '12px', color: '#94a3b8', borderBottom: '1px solid #334155' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['X', 'Y'].map(axis => {
                        const row = results.axes[axis];
                        if (!row || row.netDiff === 0) return null;
                        return (
                          <tr key={axis}>
                            <td style={{ padding: '12px', borderBottom: '1px solid #1e293b', fontSize: '14px', color: '#38bdf8' }}>{axis}-Ax</td>
                            <td style={{ padding: '12px', borderBottom: '1px solid #1e293b', fontSize: '14px' }}>{formatUnit(unitSystem, 'shortLength', row.delta, 3)}</td>
                            <td style={{ padding: '12px', borderBottom: '1px solid #1e293b', fontSize: '14px' }}>{formatUnit(unitSystem, 'length', row.bendingLeg, 1)}</td>
                            <td style={{ padding: '12px', borderBottom: '1px solid #1e293b', fontSize: '14px' }}>{formatUnit(unitSystem, 'force', row.force, 0)}</td>
                            <td style={{ padding: '12px', borderBottom: '1px solid #1e293b', fontSize: '14px' }}>{formatUnit(unitSystem, 'pressure', row.stress, 0)}</td>
                            <td style={{ padding: '12px', borderBottom: '1px solid #1e293b', fontSize: '14px' }}>
                              <span style={styles.statusBadge(row.status === 'PASS')}>{row.status}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
           </div>
        </div>
    </div>
  );
}
