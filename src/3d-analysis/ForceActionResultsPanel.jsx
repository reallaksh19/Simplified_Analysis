import React from 'react';
import { useAnalysisStore } from './AnalysisStore';

const box = { border: '1px solid #334155', borderRadius: 8, padding: 10, background: '#020617', color: '#cbd5e1', fontSize: 12, marginBottom: 8 };
const btn = { background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', borderRadius: 4, padding: '5px 8px', cursor: 'pointer' };

export default function ForceActionResultsPanel() {
  const run = useAnalysisStore((s) => s.runForceActionCalculation);
  const result = useAnalysisStore((s) => s.forceActionResult);

  return (
    <div data-testid="3d-force-action-results-panel" style={box}>
      <div style={{ color: '#93c5fd', fontWeight: 700 }}>Force Actions</div>
      <button data-testid="3d-run-force-actions" style={btn} onClick={run}>Run Force Actions</button>
      {result && (
        <div>
          <div>Status: {result.status}</div>
          <div>Node forces: {result.summary?.nodeForceCount ?? 0}</div>
          <table data-testid="3d-node-force-table" style={{ width: '100%', marginTop: 6 }}>
            <tbody>{(result.nodeForces || []).map((row) => <tr key={row.nodeId}><td>{row.nodeId}</td><td>{Number(row.resultant_N).toFixed(1)} N</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
