import React, { useState } from 'react';
import { useExtendedStore } from '../store/useExtendedStore';
import { runExtendedSolver } from '../solver/ExtendedSolver';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import DebugConsole from './DebugConsole';
import { getUnitLabel, formatUnit, MetricToImperial } from '../utils/units';

const styles = {
  layout: { display: 'flex', width: '100%', height: '100%', overflow: 'hidden' },
  leftDock: { width: '320px', background: '#0f172a', borderRight: '1px solid #1e293b', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flexShrink: 0 },
  mainContent: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  canvasContainer: { flex: 1, position: 'relative', background: '#020617', borderBottom: '1px solid #1e293b' },
  resultsContainer: { height: '40%', minHeight: '300px', padding: '16px', background: '#0f172a', overflowY: 'auto' },
  section: { background: '#1e293b', padding: '12px', borderRadius: '8px', border: '1px solid #334155' },
  header: { fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 'bold' },
  row: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', alignItems: 'center' },
  input: { background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', padding: '4px', borderRadius: '4px', width: '100px' },
  button: { width: '100%', padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '8px', background: '#0f172a', borderRadius: '8px', overflow: 'hidden' },
  th: { background: '#1e293b', padding: '8px', textAlign: 'left', fontSize: '11px', color: '#94a3b8', borderBottom: '1px solid #334155' },
  td: { padding: '8px', borderBottom: '1px solid #1e293b', fontSize: '12px' },
  statusBadge: (pass) => ({ background: pass ? '#064e3b' : '#7f1d1d', color: pass ? '#34d399' : '#fca5a5', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }),
  toolsPanel: { position: 'absolute', top: '16px', left: '16px', background: 'rgba(15,23,42,0.8)', padding: '12px', borderRadius: '8px', zIndex: 10, border: '1px solid #1e293b' },
  topRightPanel: { position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '8px', zIndex: 10 }
};

const NodeMesh = ({ node, isAnchor1, isAnchor2, onClick }) => (
  <mesh position={[node.x, node.y, node.z]} onClick={(e) => { e.stopPropagation(); onClick(node.id); }}>
    <sphereGeometry args={[0.5, 16, 16]} />
    <meshStandardMaterial color={isAnchor1 ? '#ef4444' : isAnchor2 ? '#f59e0b' : '#94a3b8'} />
    {(isAnchor1 || isAnchor2) && (
      <Html position={[0, 1, 0]} center>
        <div style={{ color: 'white', background: '#000', padding: '2px 4px', fontSize: '10px', borderRadius: '4px' }}>
          {isAnchor1 ? 'Anchor 1' : 'Anchor 2'}
        </div>
      </Html>
    )}
  </mesh>
);

const SegmentMesh = ({ start, end, results, heatmapMode }) => {
  const vecStart = new THREE.Vector3(start.x, start.y, start.z);
  const vecEnd = new THREE.Vector3(end.x, end.y, end.z);
  const dist = vecStart.distanceTo(vecEnd);
  const mid = new THREE.Vector3().addVectors(vecStart, vecEnd).multiplyScalar(0.5);

  const axis = new THREE.Vector3().subVectors(vecEnd, vecStart).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(up, axis);

  let color = '#cbd5e1'; // Light grey high-contrast default
  if (results && results.axes) {
    let primaryAxis = 'X';
    if (Math.abs(axis.y) > 0.5) primaryAxis = 'Y';
    if (Math.abs(axis.z) > 0.5) primaryAxis = 'Z';

    const res = results.axes[primaryAxis];
    if (res) {
      let ratio = 0;
      if (heatmapMode === 'STRESS') {
        ratio = res.stress / res.maxStress;
      } else if (heatmapMode === 'SHELL' && results.mist) {
        ratio = results.mist.interactionRatio;
      }

      if (ratio < 0.75) color = '#10b981';
      else if (ratio < 1.0) color = '#f59e0b';
      else color = '#ef4444';
    }
  }

  return (
    <mesh position={mid} quaternion={quaternion}>
      <cylinderGeometry args={[0.2, 0.2, dist, 8]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};

export default function DashboardView() {
  const { unitSystem, methodology, calculationStatus, heatmapMode, setHeatmapMode, setAnchor, inputs, vessel, boundaryMovement, constraints, results, nodes, segments, anchors, setResults } = useExtendedStore();
  const [resultsExpanded, setResultsExpanded] = useState(true);

  const handleNodeClick = (nodeId) => {
    if (!anchors.anchor1) setAnchor(1, nodeId);
    else if (!anchors.anchor2 && anchors.anchor1 !== nodeId) setAnchor(2, nodeId);
  };

  const handleRun = () => {
    if (calculationStatus !== 'READY' && calculationStatus !== 'CALCULATED') return;

    // PRE-PROCESSOR: Engine expects Imperial. If UI is Metric, convert inputs down to Imperial before running.
    const engineInputs = { ...inputs };
    const engineVessel = { ...vessel };
    const engineBounds = { ...boundaryMovement };

    if (unitSystem === 'Metric') {
      engineInputs.tOperate = MetricToImperial.C_to_F(inputs.tOperate);
      engineInputs.corrosionAllowance = MetricToImperial.mm_to_in(inputs.corrosionAllowance);
      engineVessel.vesselOD = MetricToImperial.mm_to_in(vessel.vesselOD);
      engineVessel.vesselThk = MetricToImperial.mm_to_in(vessel.vesselThk);
      engineVessel.nozzleRad = MetricToImperial.mm_to_in(vessel.nozzleRad);
      engineVessel.designPress = MetricToImperial.MPa_to_psi(vessel.designPress);
      engineBounds.x = MetricToImperial.mm_to_in(boundaryMovement.x);
      engineBounds.y = MetricToImperial.mm_to_in(boundaryMovement.y);
      engineBounds.z = MetricToImperial.mm_to_in(boundaryMovement.z);
    }

    const payload = { nodes, segments, anchors, inputs: engineInputs, vessel: engineVessel, boundaryMovement: engineBounds, constraints, methodology };

    const res = runExtendedSolver(payload);
    res.meta.methodologyUsed = methodology === '2D_BUNDLE' ? 'SIMPLIFIED_3D_METHOD' : 'FLUOR_MIST';
    setResults(res);
  };

  return (
    <div style={styles.layout}>
      {/* LEFT DOCK */}
      <div style={styles.leftDock}>
        <div style={styles.section}>
          <div style={styles.header}>Piping Inputs</div>
          <div style={styles.row}><span>Material:</span> <select style={styles.input} value={inputs.material} onChange={e => useExtendedStore.getState().updateInput('material', e.target.value)}><option>Carbon Steel</option><option>Austenitic Stainless Steel 18 Cr 8 Ni</option></select></div>
          <div style={styles.row}><span>Size (in):</span> <input type="number" style={styles.input} value={inputs.pipeSize} onChange={e => useExtendedStore.getState().updateInput('pipeSize', Number(e.target.value))} /></div>
          <div style={styles.row}><span>Schedule:</span> <select style={styles.input} value={inputs.schedule} onChange={e => useExtendedStore.getState().updateInput('schedule', e.target.value)}><option>40</option><option>80</option></select></div>
          <div style={styles.row}><span>T_Operate ({getUnitLabel(unitSystem, 'temp')}):</span> <input type="number" style={styles.input} value={inputs.tOperate} onChange={e => useExtendedStore.getState().updateInput('tOperate', Number(e.target.value))} /></div>
        </div>

        <div style={styles.section}>
          <div style={styles.header}>Mechanical & Mfg</div>
          <div style={styles.row}>
            <span>Friction (μ):</span>
            <input type="number" step="0.01"
              style={{ ...styles.input, opacity: methodology === 'FLUOR' ? 0.5 : 1 }}
              disabled={methodology === 'FLUOR'}
              title={methodology === 'FLUOR' ? "Only applicable in 2D Bundle Method" : ""}
              value={inputs.frictionFactor} onChange={e => useExtendedStore.getState().updateInput('frictionFactor', Number(e.target.value))} />
          </div>
          <div style={styles.row}><span>Corr. Allow ({getUnitLabel(unitSystem, 'shortLength')}):</span> <input type="number" step="0.01" style={styles.input} value={inputs.corrosionAllowance} onChange={e => useExtendedStore.getState().updateInput('corrosionAllowance', Number(e.target.value))} /></div>
          <div style={styles.row}><span>Mill Tol (%):</span> <input type="number" step="0.1" style={styles.input} value={inputs.millTolerance} onChange={e => useExtendedStore.getState().updateInput('millTolerance', Number(e.target.value))} /></div>
        </div>

        <div style={styles.section}>
          <div style={styles.header}>Boundary Movement (Anchor 1)</div>
          <div style={styles.row}><span>X ({getUnitLabel(unitSystem, 'shortLength')}):</span> <input type="number" step="0.1" style={styles.input} value={boundaryMovement.x} onChange={e => useExtendedStore.getState().updateBoundaryMovement('x', Number(e.target.value))} /></div>
          <div style={styles.row}><span>Y ({getUnitLabel(unitSystem, 'shortLength')}):</span> <input type="number" step="0.1" style={styles.input} value={boundaryMovement.y} onChange={e => useExtendedStore.getState().updateBoundaryMovement('y', Number(e.target.value))} /></div>
          <div style={styles.row}><span>Z ({getUnitLabel(unitSystem, 'shortLength')}):</span> <input type="number" step="0.1" style={styles.input} value={boundaryMovement.z} onChange={e => useExtendedStore.getState().updateBoundaryMovement('z', Number(e.target.value))} /></div>
        </div>

        <div style={styles.section}>
          <div style={styles.header}>Vessel & Nozzle (MIST)</div>
          <div style={styles.row}><span>Vessel OD ({getUnitLabel(unitSystem, 'shortLength')}):</span> <input type="number" step="0.1" style={styles.input} value={vessel.vesselOD} onChange={e => useExtendedStore.getState().updateVessel('vesselOD', Number(e.target.value))} /></div>
          <div style={styles.row}><span>Vessel Thk ({getUnitLabel(unitSystem, 'shortLength')}):</span> <input type="number" step="0.1" style={styles.input} value={vessel.vesselThk} onChange={e => useExtendedStore.getState().updateVessel('vesselThk', Number(e.target.value))} /></div>
          <div style={styles.row}><span>Nozzle Rad ({getUnitLabel(unitSystem, 'shortLength')}):</span> <input type="number" step="0.1" style={styles.input} value={vessel.nozzleRad} onChange={e => useExtendedStore.getState().updateVessel('nozzleRad', Number(e.target.value))} /></div>
          <div style={styles.row}><span>Design Prs ({getUnitLabel(unitSystem, 'pressure')}):</span> <input type="number" step="1" style={styles.input} value={vessel.designPress} onChange={e => useExtendedStore.getState().updateVessel('designPress', Number(e.target.value))} /></div>
          <div style={styles.row}><span>Flange Cls (#):</span> <select style={styles.input} value={vessel.flangeClass} onChange={e => useExtendedStore.getState().updateVessel('flangeClass', Number(e.target.value))}><option>150</option><option>300</option><option>600</option></select></div>
        </div>

        <div style={styles.section}>
          <div style={styles.header}>Import Geometry</div>
          <button style={{ ...styles.button, background: '#1e293b', color: '#38bdf8', padding: '8px', marginBottom: '8px', fontSize: '12px', border: '1px solid #38bdf8' }} onClick={() => useExtendedStore.getState().importFrom3DViewer()}>
            ↓ Pull from 3D Viewer
          </button>
          <button style={{ ...styles.button, background: '#1e293b', color: '#a78bfa', padding: '8px', marginBottom: '8px', fontSize: '12px', border: '1px solid #a78bfa' }} onClick={() => useExtendedStore.getState().importFrom2DSketcher()}>
            ↓ Pull from 2D Sketcher
          </button>
          <button style={{ ...styles.button, background: '#1e293b', color: '#f59e0b', padding: '8px', fontSize: '12px', border: '1px solid #f59e0b' }} onClick={async () => {
            const m = await import('../mocks/mock-data.js');
            useExtendedStore.getState().loadMockData(m.MultiPlane_10Leg_GM);
          }}>
            🧪 Load Golden Master Mock
          </button>
        </div>

        <button
          style={{ ...styles.button, background: '#10b981', opacity: calculationStatus === 'AWAITING_ANCHORS' ? 0.5 : 1, cursor: calculationStatus === 'AWAITING_ANCHORS' ? 'not-allowed' : 'pointer' }}
          onClick={handleRun}
          disabled={calculationStatus === 'AWAITING_ANCHORS'}
        >
          {calculationStatus === 'AWAITING_ANCHORS' ? 'AWAITING ANCHORS' : 'RUN CALCULATION ►'}
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div style={styles.mainContent}>

        <div style={styles.canvasContainer}>
          <div style={styles.toolsPanel}>
            <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>R3F TOOLS:</div>
            <div style={{ color: '#e2e8f0', fontSize: '12px', marginBottom: '8px' }}>
              {(!anchors.anchor1 || !anchors.anchor2) ? '👉 Click nodes to set Anchors' : '✅ Anchors Set'}
            </div>
            <button style={{ ...styles.button, background: '#ef4444', fontSize: '11px', padding: '6px' }} onClick={() => { setAnchor(1, null); setAnchor(2, null); setResults(null); }}>Reset Anchors</button>
          </div>

          <div style={styles.topRightPanel}>
            <button style={{ ...styles.button, background: heatmapMode === 'STRESS' ? '#3b82f6' : '#1e293b', padding: '6px 12px', fontSize: '12px' }} onClick={() => setHeatmapMode('STRESS')}>STRESS HEATMAP</button>
            <button style={{ ...styles.button, background: heatmapMode === 'SHELL' ? '#a78bfa' : '#1e293b', padding: '6px 12px', fontSize: '12px' }} onClick={() => setHeatmapMode('SHELL')}>SHELL HEATMAP</button>
          </div>

          <Canvas camera={{ position: [50, 50, 50], fov: 60 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[100, 100, 100]} />
            <OrbitControls />
            <gridHelper args={[100, 10]} />
            <axesHelper args={[20]} />

            {segments.map(seg => {
              const s1 = nodes.find(n => n.id === seg.startNodeId);
              const s2 = nodes.find(n => n.id === seg.endNodeId);
              if (!s1 || !s2) return null;
              return <SegmentMesh key={seg.id} start={s1} end={s2} results={results} heatmapMode={heatmapMode} />;
            })}

            {nodes.map(node => (
              <NodeMesh
                key={node.id}
                node={node}
                isAnchor1={anchors.anchor1 === node.id}
                isAnchor2={anchors.anchor2 === node.id}
                onClick={handleNodeClick}
              />
            ))}
          </Canvas>
          <DebugConsole />
        </div>

        <div style={{ ...styles.resultsContainer, height: resultsExpanded ? 'auto' : '48px', minHeight: resultsExpanded ? '300px' : '48px', overflow: 'hidden' }}>
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', cursor: 'pointer' }}
            onClick={() => setResultsExpanded(!resultsExpanded)}
          >
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {resultsExpanded ? '▼' : '▶'} Stress Engine Results
            </div>
            <div style={{ color: '#94a3b8', fontSize: '12px' }}>
              Status: <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>[{calculationStatus}]</span>
              {results && <span style={{ marginLeft: '12px', color: '#10b981' }}>— Method: {results.meta.methodologyUsed}</span>}
            </div>
          </div>

          {results && resultsExpanded && (
            <div style={{ display: 'flex', gap: '16px' }}>

              {/* Left DataGrid (Piping Stress / Axes) */}
              <div style={{ flex: 1.5, background: '#020617', padding: '12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#38bdf8', marginBottom: '8px' }}>1. PIPING STRESS (Global Reactions)</div>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Axis</th>
                      <th style={styles.th}>Δ ({getUnitLabel(unitSystem, 'shortLength')})</th>
                      <th style={styles.th}>B ({getUnitLabel(unitSystem, 'length')})</th>
                      <th style={styles.th}>Force ({getUnitLabel(unitSystem, 'force')})</th>
                      <th style={styles.th}>Stress ({getUnitLabel(unitSystem, 'pressure')})</th>
                      <th style={styles.th}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['X', 'Y', 'Z'].map(axis => {
                      const row = results.axes[axis];
                      if (!row) return null;
                      return (
                        <tr key={axis}>
                          <td style={styles.td}>{axis}-Ax</td>
                          <td style={styles.td}>{formatUnit(unitSystem, 'shortLength', row.delta, 3)}</td>
                          <td style={styles.td}>{formatUnit(unitSystem, 'length', row.bendingLeg, 1)}</td>
                          <td style={styles.td}>{formatUnit(unitSystem, 'force', row.force, 0)}</td>
                          <td style={styles.td}>{formatUnit(unitSystem, 'pressure', row.stress, 0)}</td>
                          <td style={styles.td}><span style={styles.statusBadge(row.status === 'PASS')}>{row.status}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Right Evaluation Blocks (MIST & Flange) */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: '#020617', padding: '12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#a78bfa', marginBottom: '8px' }}>2. VESSEL SHELL (MIST)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div>K-Factor: <span style={{ color: '#e2e8f0' }}>{results.mist?.K ? results.mist.K.toFixed(0) : '-'}</span></div>
                    <div>Ratio: <span style={{ color: '#e2e8f0' }}>{results.mist?.interactionRatio ? results.mist.interactionRatio.toFixed(3) : '-'}</span></div>
                    <div style={{ gridColumn: 'span 2' }}>STATUS: <span style={styles.statusBadge(results.mist?.status === 'PASS')}>{results.mist?.status || 'N/A'}</span></div>
                  </div>
                </div>

                <div style={{ background: '#020617', padding: '12px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '8px' }}>3. FLANGE LEAKAGE (Kellogg)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div>Eq Load: <span style={{ color: '#e2e8f0' }}>{results.flange?.equivalentLoad ? results.flange.equivalentLoad.toExponential(2) : '-'}</span></div>
                    <div>Capacity: <span style={{ color: '#94a3b8' }}>{results.flange?.allowableCapacity ? results.flange.allowableCapacity.toExponential(2) : '-'}</span></div>
                    <div style={{ gridColumn: 'span 2' }}>STATUS: <span style={styles.statusBadge(results.flange?.status === 'PASS')}>{results.flange?.status || 'N/A'}</span></div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
