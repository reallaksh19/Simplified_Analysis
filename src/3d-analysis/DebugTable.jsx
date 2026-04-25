import React from 'react';
import { useAnalysisStore } from './AnalysisStore';
import { displayValue } from './GC3DUnitConverter';

export const DebugTable = () => {
  const nodeResults = useAnalysisStore(s => s.nodeResults);
  const legResults = useAnalysisStore(s => s.legResults);
  const segments = useAnalysisStore(s => s.segments);
  const setSelectedNode = useAnalysisStore(s => s.setSelectedNode);
  const unitSystem = useAnalysisStore(s => s.unitSystem);

  const getLabel = (base, quantity) => {
      const parts = displayValue(0, quantity, unitSystem, 0).split(' ');
      return `${base} (${parts[1]})`;
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#0f172a', color: '#f8fafc', padding: '0' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
        <thead style={{ position: 'sticky', top: 0, background: '#1e293b', borderBottom: '2px solid #334155', color: '#94a3b8' }}>
          <tr>
            <th style={{ padding: '8px 16px' }}>Node ID</th>
            <th style={{ padding: '8px 16px' }}>{getLabel('Leg Length', 'length')}</th>
            <th style={{ padding: '8px 16px' }}>{getLabel('Force', 'force')}</th>
            <th style={{ padding: '8px 16px' }}>{getLabel('Moment', 'moment')}</th>
            <th style={{ padding: '8px 16px' }}>{getLabel('Calc Stress', 'stress')}</th>
            <th style={{ padding: '8px 16px' }}>{getLabel('Allowable', 'stress')}</th>
            <th style={{ padding: '8px 16px' }}>Ratio</th>
            <th style={{ padding: '8px 16px' }}>Pass/Fail</th>
          </tr>
        </thead>
        <tbody>
          {nodeResults.length === 0 && (
            <tr><td colSpan={8} style={{ padding: '16px', textAlign: 'center', color: '#475569' }}>Run analysis to generate results.</td></tr>
          )}
          {nodeResults.map((r, i) => {
            const isFail = r.result === 'FAIL';

            // Determine max force/moment/length associated with this node to satisfy strict display request
            const connectedLegs = legResults.filter(l => {
                const legSeg = segments.find(s => s.id === l.legId);
                return legSeg && (legSeg.startNode === r.nodeId || legSeg.endNode === r.nodeId);
            });

            const maxF = connectedLegs.reduce((max, l) => Math.max(max, l.F_lbf || 0), 0);
            const maxM = connectedLegs.reduce((max, l) => Math.max(max, l.M_inlbf || 0), 0);
            const maxL = connectedLegs.reduce((max, l) => Math.max(max, l.L_in || 0), 0);

            return (
              <tr
                 key={i}
                 onClick={() => {
                     useAnalysisStore.getState().setCameraViewMode('selected');
                     setSelectedNode(r.nodeId);
                 }}
                 style={{ borderBottom: '1px solid #1e293b', cursor: 'pointer' }}
                 onMouseOver={(e) => e.currentTarget.style.background = '#1e293b'}
                 onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '8px 16px', color: '#38bdf8', fontWeight: 'bold' }}>{r.nodeId}</td>
                <td style={{ padding: '8px 16px', color: '#cbd5e1' }}>
                    {displayValue(maxL, 'length', unitSystem, 1).split(' ')[0]}
                </td>
                <td style={{ padding: '8px 16px', color: '#f59e0b' }}>
                    {displayValue(maxF, 'force', unitSystem, 0).split(' ')[0]}
                </td>
                <td style={{ padding: '8px 16px', color: '#f59e0b' }}>
                    {displayValue(maxM, 'moment', unitSystem, 0).split(' ')[0]}
                </td>
                <td style={{ padding: '8px 16px', color: isFail ? '#ef4444' : '#f8fafc', fontWeight: 'bold' }}>
                    {displayValue(r.SE_psi, 'stress', unitSystem, 0).split(' ')[0]}
                </td>
                <td style={{ padding: '8px 16px' }}>
                    {displayValue(r.SA_psi, 'stress', unitSystem, 0).split(' ')[0]}
                </td>
                <td style={{ padding: '8px 16px', color: isFail ? '#ef4444' : (r.ratio > 0.7 ? '#eab308' : '#10b981') }}>
                    {((r.ratio || 0) * 100).toFixed(1)}%
                </td>
                <td style={{ padding: '8px 16px', fontWeight: 'bold', color: isFail ? '#ef4444' : '#10b981' }}>
                    {r.result}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
