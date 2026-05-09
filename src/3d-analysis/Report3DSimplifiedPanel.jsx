import React from 'react';
import { useAnalysisStore } from './AnalysisStore';

const box = { border: '1px solid #334155', borderRadius: 8, padding: 10, background: '#020617', color: '#cbd5e1', fontSize: 12, marginBottom: 8 };
const btn = { background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', borderRadius: 4, padding: '5px 8px', cursor: 'pointer' };

export default function Report3DSimplifiedPanel() {
  const build = useAnalysisStore((s) => s.buildSimplified3DReport);
  const report = useAnalysisStore((s) => s.simplified3DReport);

  return (
    <div data-testid="3d-simplified-report-panel" style={box}>
      <div style={{ color: '#93c5fd', fontWeight: 700 }}>3D Simplified Report</div>
      <button data-testid="3d-build-report" style={btn} onClick={() => build({ issueType: 'SCREENING_ISSUE' })}>Build Report</button>
      {report && (
        <>
          <div data-testid="3d-report-summary" style={{ marginTop: 6 }}>Status: {report.status}</div>
          <div data-testid="3d-report-blockers">Blockers: {report.blockers?.length || 0}</div>
          <div data-testid="3d-report-export-actions">Exports: JSON / Markdown / HTML ready</div>
          <pre data-testid="3d-report-markdown-preview" style={{ whiteSpace: 'pre-wrap', maxHeight: 180, overflow: 'auto', background: '#0f172a', padding: 8 }}>{report.markdown}</pre>
        </>
      )}
    </div>
  );
}
