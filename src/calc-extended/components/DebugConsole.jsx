import React from 'react';
import { useExtendedStore } from '../store/useExtendedStore';

const styles = {
  console: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: '400px',
    height: '250px',
    background: 'rgba(2, 6, 23, 0.9)', // Slate 950 with transparency
    borderTopLeftRadius: '8px',
    border: '1px solid #1e293b',
    color: '#38bdf8',
    fontFamily: 'monospace',
    fontSize: '11px',
    padding: '12px',
    overflowY: 'auto',
    zIndex: 20
  },
  header: { color: '#94a3b8', fontWeight: 'bold', borderBottom: '1px solid #1e293b', paddingBottom: '4px', marginBottom: '8px' }
};

export default function DebugConsole() {
  const { results, nodes, segments } = useExtendedStore();

  if (!results || !results.meta) return null;

  const meta = results.meta;

  return (
    <div style={styles.console}>
      <div style={styles.header}>Verbose Debug Logs</div>
      <div>{"> "} [GEO] Parsed {nodes.length} nodes, {segments.length} segments.</div>
      <div>{"> "} [FILTER] Filtered out {meta.shortDropsIgnored ?? '?'} short drops (≤ 3ft).</div>
      <br/>
      <div>{"> "} [DB] Lookups successful:</div>
      <div>  e = {meta.e != null ? meta.e.toFixed(6) : 'N/A'} in/ft</div>
      <div>  E = {meta.E != null ? (meta.E / 1000000).toFixed(1) : 'N/A'}M PSI</div>
      <div>  I = {meta.I != null ? meta.I.toFixed(2) : 'N/A'} in^4</div>
      <div>  OD = {meta.OD != null ? meta.OD.toFixed(3) : 'N/A'} in</div>
      <br/>
      {['X', 'Y', 'Z'].map(axis => {
        const ax = results.axes[axis];
        return (
          <div key={axis}>
            {"> "} [MATH_{axis}] Δ: {ax.delta.toFixed(3)}", B: {ax.bendingLeg}ft
            <br/>
            {"> "} [LIMIT_{axis}] P: {ax.force.toFixed(0)} / {ax.maxForce} lbs | Sb: {ax.stress.toFixed(0)} / {ax.maxStress} PSI
            <br/><br/>
          </div>
        )
      })}
    </div>
  );
}
