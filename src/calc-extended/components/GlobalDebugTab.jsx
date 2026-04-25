import React from 'react';
import { useExtendedStore } from '../store/useExtendedStore';
import { usePipeRackStore } from '../../piperack/store/usePipeRackStore';
import { getUnitLabel, formatUnit } from '../utils/units';
import { useAppStore } from '../../store/appStore';

const styles = {
  container: { flex: 1, display: 'flex', flexDirection: 'column', background: '#020617', color: '#f8fafc', overflowY: 'auto', padding: '24px', fontFamily: 'monospace' },
  header: { fontSize: '18px', fontWeight: 'bold', color: '#38bdf8', borderBottom: '2px solid #1e293b', paddingBottom: '8px', marginBottom: '16px' },
  section: { background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b', marginBottom: '24px' },
  sectionTitle: { fontSize: '14px', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '12px', borderBottom: '1px dashed #334155', paddingBottom: '4px' },
  row: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' },
  label: { color: '#94a3b8' },
  value: { color: '#e2e8f0', fontWeight: 'bold' },
  codeBlock: { background: '#1e293b', padding: '12px', borderRadius: '4px', border: '1px solid #334155', overflowX: 'auto', fontSize: '12px', color: '#a78bfa', marginTop: '8px' }
};

export default function GlobalDebugTab() {
  const { results: extResults, nodes, segments, methodology } = useExtendedStore();
  const { results: rackResults } = usePipeRackStore();
  const unitSystem = useAppStore(state => state.unitSystem);

  return (
    <div style={styles.container}>
      <div style={styles.header}>Calculation Worksheet & Debug Steps</div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>1. GLOBAL PIPING STRESS ENGINE (2D & 3D Solvers)</div>
        {!extResults ? (
          <div style={{ color: '#475569', fontStyle: 'italic' }}>No extended stress results found. Run a calculation first.</div>
        ) : (
          <>
            <div style={styles.row}><span style={styles.label}>Methodology:</span> <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{extResults.meta.methodologyUsed}</span></div>
            <div style={styles.row}><span style={styles.label}>Nodes Parsed:</span> <span style={styles.value}>{nodes.length}</span></div>
            <div style={styles.row}><span style={styles.label}>Segments Parsed:</span> <span style={styles.value}>{segments.length}</span></div>
            <div style={styles.row}><span style={styles.label}>Short Drops Ignored (Rule of Rigidity):</span> <span style={{ color: '#38bdf8' }}>{extResults.meta.shortDropsIgnored}</span></div>

            <div style={{ ...styles.sectionTitle, marginTop: '16px', color: '#94a3b8' }}>Material Database Lookups</div>
            <div style={styles.row}><span style={styles.label}>Coefficient of Expansion (e):</span> <span style={styles.value}>{extResults.meta.e.toFixed(6)} in/ft</span></div>
            <div style={styles.row}><span style={styles.label}>Modulus of Elasticity (E):</span> <span style={styles.value}>{(extResults.meta.E / 1000000).toFixed(1)} MPSI</span></div>
            <div style={styles.row}><span style={styles.label}>Nominal Pipe Size (OD):</span> <span style={styles.value}>{extResults.meta.OD.toFixed(3)} in</span></div>
            <div style={styles.row}><span style={styles.label}>Moment of Inertia (I_eff):</span> <span style={styles.value}>{extResults.meta.I_eff.toFixed(2)} in^4</span></div>

            <div style={{ ...styles.sectionTitle, marginTop: '16px', color: '#94a3b8' }}>Mathematical Axis Evaluation (Worksheet)</div>
            {['X', 'Y', 'Z'].map(axis => {
              const ax = extResults.axes[axis];
              if (!ax) return null;

              // Depending on methodology we show different formulas
              const methodologyTag = extResults.meta.methodologyUsed === '2D_BUNDLE' ? ' * (1 + μ friction multiplier)' : '';

              return (
                <div key={axis} style={styles.codeBlock}>
                  <div style={{ color: '#cbd5e1', fontWeight: 'bold', marginBottom: '4px' }}>--- {axis}-Axis Calculation Steps ---</div>
                  <div>Step 1: Thermal Growth Δ = (Net_Leg_{axis} * e) + BoundaryMovement</div>
                  <div>          Δ = ({ax.netDiff.toFixed(2)} ft * {extResults.meta.e.toFixed(6)} in/ft) = <span style={{ color: '#38bdf8' }}>{ax.delta.toFixed(4)} in</span></div>
                  <div>Step 2: Flexibility Leg L = <span style={{ color: '#f59e0b' }}>{ax.bendingLeg.toFixed(1)} ft</span></div>
                  <div>Step 3: Force (P) = (3 * E * I_eff * Δ) / (144 * L^3){methodologyTag}</div>
                  <div>          P = (3 * {extResults.meta.E.toExponential(2)} * {extResults.meta.I_eff.toFixed(1)} * {ax.delta.toFixed(3)}) / (144 * {ax.bendingLeg.toFixed(0)}^3) = <span style={{ color: '#ef4444' }}>{ax.force.toFixed(1)} lbs</span></div>
                  <div>Step 4: Stress (S_b) = (3 * E * OD * Δ) / (144 * L^2){methodologyTag}</div>
                  <div>          S_b = (3 * {extResults.meta.E.toExponential(2)} * {extResults.meta.OD.toFixed(1)} * {ax.delta.toFixed(3)}) / (144 * {ax.bendingLeg.toFixed(0)}^2) = <span style={{ color: '#10b981' }}>{ax.stress.toFixed(1)} PSI</span></div>
                  <div style={{ marginTop: '4px', color: ax.status === 'PASS' ? '#10b981' : '#ef4444' }}>Result: {ax.status} (Limit: {ax.maxStress} PSI)</div>
                </div>
              );
            })}
          </>
        )}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>2. PIPE RACK CALCULATION (M.W. Kellogg Method)</div>
        {!rackResults ? (
          <div style={{ color: '#475569', fontStyle: 'italic' }}>No pipe rack results found. Generate a pipe rack loop first.</div>
        ) : (
          <>
             <div style={styles.row}><span style={styles.label}>Global Methodology Overwrite:</span> <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{rackResults.meta.methodology}</span></div>
             <div style={styles.row}><span style={styles.label}>Governing Line:</span> <span style={styles.value}>{rackResults.governingLine.id}</span></div>
             <div style={styles.row}><span style={styles.label}>Governing Expansion (ΔX):</span> <span style={styles.value}>{rackResults.meta.governingDeltaX.toFixed(4)} in</span></div>
             <div style={styles.row}><span style={styles.label}>Maximum Absorber Required (L):</span> <span style={styles.value}>{rackResults.meta.maxL.toFixed(2)} ft</span></div>

             <div style={styles.codeBlock}>
                <div style={{ color: '#cbd5e1', fontWeight: 'bold', marginBottom: '4px' }}>--- Loop Sizing Rules ---</div>
                {(() => {
                  const govLine = rackResults.lines.find(l => l.id === rackResults.governingLine.id) || rackResults.lines[0];
                  if (!govLine) return null;
                  return (
                    <>
                      <div>Width (W) is fixed to rack spacing step: {govLine.dimensions.W_ft.toFixed(2)} ft</div>
                      <div>Calculated Height (H) = (L - W) / 2</div>
                      <div>Calculated L (Absorbing Leg Needed) for Line {govLine.id}:</div>
                      <div>L = sqrt( (3 * E * OD * ΔX) / (144 * AllowableStress) )</div>
                      {rackResults.meta.methodology === '2D_BUNDLE' && (
                        <div style={{ color: '#f59e0b' }}>* Applying 1.3x Bundle Stiffness Multiplier (2D BUNDLE Mode)</div>
                      )}
                      <div style={{ marginTop: '8px' }}>Final Generated Geometry:</div>
                      <div>Width (W): <span style={{ color: '#38bdf8' }}>{govLine.dimensions.W_ft.toFixed(2)} ft</span></div>
                      <div>Height (H): <span style={{ color: '#38bdf8' }}>{govLine.dimensions.H_ft.toFixed(2)} ft</span></div>
                      <div>Total Absorber (L): <span style={{ color: '#10b981' }}>{govLine.dimensions.L_req_ft.toFixed(2)} ft</span></div>
                    </>
                  );
                })()}
             </div>
          </>
        )}
      </div>

    </div>
  );
}
