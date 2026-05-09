import React from 'react';
import { useAnalysisStore } from './AnalysisStore';

const box = { border: '1px solid #334155', borderRadius: 8, padding: 10, background: '#020617', color: '#cbd5e1', fontSize: 12, marginBottom: 8 };
const btn = { background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', borderRadius: 4, padding: '5px 8px', cursor: 'pointer' };

export default function SupportLoadResultsPanel() {
  const run = useAnalysisStore((s) => s.runSupportLoadCalculation);
  const result = useAnalysisStore((s) => s.supportLoadResult);

  return (
    <div data-testid="3d-support-load-results-panel" style={box}>
      <div style={{ color: '#93c5fd', fontWeight: 700 }}>Support Deadweight Loads</div>
      <button data-testid="3d-run-support-loads" style={btn} onClick={run}>Run Support Loads</button>
      {result && (
        <div data-testid="3d-support-load-summary">
          <div>Status: {result.status}</div>
          <div>Total weight N: {Number(result.summary?.totalWeight_N || 0).toFixed(2)}</div>
          <table data-testid="3d-support-load-table" style={{ width: '100%', marginTop: 6 }}>
            <tbody>{(result.supportLoads || []).map((row) => <tr key={row.nodeId}><td>{row.nodeId}</td><td>{Number(row.verticalLoad_N).toFixed(1)} N</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
