import React, { useState } from 'react';
import { useAnalysisStore } from './AnalysisStore';
import { displayValue } from './GC3DUnitConverter';

const RatioBar = ({ ratio }) => {
  const pct = Math.min(ratio * 100, 120); // cap display at 120%
  const color = ratio > 1.0 ? '#ef4444' : ratio > 0.95 ? '#f59e0b' : '#22c55e';
  return (
    <div style={{ position: 'relative', height: '6px', background: '#1e293b',
                  borderRadius: '3px', width: '80px', display: 'inline-block' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%',
                    width: `${Math.min(pct, 100)}%`, background: color,
                    borderRadius: '3px', transition: 'width 0.3s' }} />
      {ratio > 1.0 && (
        <div style={{ position: 'absolute', left: '100%', top: 0, height: '100%',
                      width: `${pct - 100}%`, background: '#7f1d1d', borderRadius: '0 3px 3px 0' }} />
      )}
    </div>
  );
};

const NodeResultRow = ({ result, legResults, segments, onSelect, selectedNodeId, unitSystem }) => {
  const [expanded, setExpanded] = useState(false);
  const isSelected = selectedNodeId === result.nodeId;

  const ratioColor = result.ratio > 1.0 ? '#ef4444'      // red — FAIL
                   : result.ratio > 0.95 ? '#f59e0b'     // amber — MARGINAL
                   : '#22c55e';                          // green — PASS

  const connectedLegs = legResults.filter(l => {
      const legSeg = segments.find(s => s.id === l.legId);
      return legSeg && (legSeg.startNode === result.nodeId || legSeg.endNode === result.nodeId);
  });

  const maxF = connectedLegs.reduce((max, l) => Math.max(max, l.F_lbf || 0), 0);
  const maxM = connectedLegs.reduce((max, l) => Math.max(max, l.M_inlbf || 0), 0);
  const maxL = connectedLegs.reduce((max, l) => Math.max(max, l.L_in || 0), 0);

  return (
    <>
      <tr onClick={() => { onSelect(result.nodeId); setExpanded(!expanded); }}
          style={{ cursor: 'pointer', background: isSelected ? '#1e3a5f' : 'transparent', borderBottom: '1px solid #1e293b' }}
          onMouseOver={(e) => e.currentTarget.style.background = isSelected ? '#1e3a5f' : '#1e293b'}
          onMouseOut={(e) => e.currentTarget.style.background = isSelected ? '#1e3a5f' : 'transparent'}>
        <td style={{ padding: '8px 16px', color: '#38bdf8', fontWeight: 'bold' }}>{result.nodeId}</td>
        <td style={{ padding: '8px 16px', color: '#cbd5e1' }}>
            {displayValue(maxL, 'length', unitSystem, 1).split(' ')[0]}
        </td>
        <td style={{ padding: '8px 16px', color: '#f59e0b' }}>
            {displayValue(maxF, 'force', unitSystem, 0).split(' ')[0]}
        </td>
        <td style={{ padding: '8px 16px', color: '#f59e0b' }}>
            {displayValue(maxM, 'moment', unitSystem, 0).split(' ')[0]}
        </td>
        <td style={{ padding: '8px 16px', color: ratioColor, fontWeight: 'bold' }}>
            {displayValue(result.SE_psi, 'stress', unitSystem, 0).split(' ')[0]}
        </td>
        <td style={{ padding: '8px 16px' }}>
            {displayValue(result.SA_psi, 'stress', unitSystem, 0).split(' ')[0]}
        </td>
        <td style={{ padding: '8px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: ratioColor, fontWeight: 'bold', width: '45px' }}>
              {((result.ratio || 0) * 100).toFixed(1)}%
            </span>
            <RatioBar ratio={result.ratio || 0} />
          </div>
        </td>
        <td style={{ padding: '8px 16px' }}>
          <span style={{ color: ratioColor, fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 'bold' }}>
            {result.result}
          </span>
        </td>
        <td style={{ padding: '8px 16px', color: '#64748b', fontSize: '0.75rem' }}>{expanded ? '▾' : '▸'} per-axis</td>
      </tr>
      {expanded && result.perAxisSE && (
        <tr style={{ background: '#0f1e30' }}>
          <td colSpan={9} style={{ padding: '8px 16px 8px 32px', fontSize: '0.75rem', color: '#94a3b8' }}>
            {Object.entries(result.perAxisSE).map(([axis, se]) => (
              <span key={axis} style={{ marginRight: '1.5rem' }}>
                SE<sub>{axis}</sub> = {displayValue(se, 'stress', unitSystem, 0)}
              </span>
            ))}
          </td>
        </tr>
      )}
    </>
  );
};

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
          {nodeResults.map((r, i) => (
            <NodeResultRow
              key={i}
              result={r}
              legResults={legResults}
              segments={segments}
              onSelect={(nodeId) => {
                useAnalysisStore.getState().setCameraViewMode('selected');
                setSelectedNode(nodeId);
              }}
              selectedNodeId={useAnalysisStore.getState().selectedNodeId}
              unitSystem={unitSystem}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
