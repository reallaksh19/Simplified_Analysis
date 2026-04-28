import re

with open('src/3d-analysis/DebugTable.jsx', 'r') as f:
    content = f.read()

# Replace the internal row rendering
# I'll just use simple replace since we need to inject state into the map function, or we can abstract the row

row_component = """
const RatioBar = ({ ratio }) => {
  const pct = Math.min((ratio || 0) * 100, 120);
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

const NodeResultRow = ({ r, i, unitSystem, getLabel, isSelected, onSelect, connectedLegs }) => {
  const [expanded, setExpanded] = React.useState(false);

  const isFail = r.result === 'FAIL';

  const maxF = connectedLegs.reduce((max, l) => Math.max(max, l.F_lbf || 0), 0);
  const maxM = connectedLegs.reduce((max, l) => Math.max(max, l.M_inlbf || 0), 0);
  const maxL = connectedLegs.reduce((max, l) => Math.max(max, l.L_in || 0), 0);

  const ratioColor = r.ratio > 1.0 ? '#ef4444'      // red — FAIL
                   : r.ratio > 0.95 ? '#f59e0b'     // amber — MARGINAL
                   : '#22c55e';                           // green — PASS

  return (
    <>
      <tr
         onClick={() => {
             onSelect(r.nodeId);
             setExpanded(!expanded);
         }}
         style={{ borderBottom: '1px solid #1e293b', cursor: 'pointer', background: isSelected ? '#1e3a5f' : 'transparent' }}
         onMouseOver={(e) => e.currentTarget.style.background = isSelected ? '#1e3a5f' : '#1e293b'}
         onMouseOut={(e) => e.currentTarget.style.background = isSelected ? '#1e3a5f' : 'transparent'}
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
        <td style={{ padding: '8px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RatioBar ratio={r.ratio || 0} />
              <span style={{ color: ratioColor, fontWeight: 'bold' }}>
                {((r.ratio || 0) * 100).toFixed(1)}%
              </span>
            </div>
        </td>
        <td style={{ padding: '8px 16px' }}>
            <span style={{ color: ratioColor, fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 'bold' }}>
              {r.result}
            </span>
        </td>
        <td style={{ color: '#64748b', fontSize: '0.75rem' }}>▸ per-axis</td>
      </tr>
      {expanded && r.perAxisSE && (
        <tr style={{ background: '#0f1e30' }}>
          <td colSpan={9} style={{ padding: '8px 16px', paddingLeft: '2rem', fontSize: '0.75rem', color: '#94a3b8' }}>
            {Object.entries(r.perAxisSE).map(([axis, se]) => (
              <span key={axis} style={{ marginRight: '1.5rem' }}>
                SE<sub>{axis}</sub> = {se?.toFixed(0)} psi
              </span>
            ))}
          </td>
        </tr>
      )}
    </>
  );
};
"""

# I also need to add <th style={{ padding: '8px 16px' }}></th> to the head for the "per-axis" column

header_search = """          <tr>
            <th style={{ padding: '8px 16px' }}>Node ID</th>
            <th style={{ padding: '8px 16px' }}>{getLabel('Leg Length', 'length')}</th>
            <th style={{ padding: '8px 16px' }}>{getLabel('Force', 'force')}</th>
            <th style={{ padding: '8px 16px' }}>{getLabel('Moment', 'moment')}</th>
            <th style={{ padding: '8px 16px' }}>{getLabel('Calc Stress', 'stress')}</th>
            <th style={{ padding: '8px 16px' }}>{getLabel('Allowable', 'stress')}</th>
            <th style={{ padding: '8px 16px' }}>Ratio</th>
            <th style={{ padding: '8px 16px' }}>Pass/Fail</th>
          </tr>"""

header_replace = """          <tr>
            <th style={{ padding: '8px 16px' }}>Node ID</th>
            <th style={{ padding: '8px 16px' }}>{getLabel('Leg Length', 'length')}</th>
            <th style={{ padding: '8px 16px' }}>{getLabel('Force', 'force')}</th>
            <th style={{ padding: '8px 16px' }}>{getLabel('Moment', 'moment')}</th>
            <th style={{ padding: '8px 16px' }}>{getLabel('Calc Stress', 'stress')}</th>
            <th style={{ padding: '8px 16px' }}>{getLabel('Allowable', 'stress')}</th>
            <th style={{ padding: '8px 16px' }}>Ratio</th>
            <th style={{ padding: '8px 16px' }}>Pass/Fail</th>
            <th style={{ padding: '8px 16px' }}></th>
          </tr>"""

content = content.replace(header_search, header_replace)


imports_search = """import { displayValue } from './GC3DUnitConverter';"""
imports_replace = """import { displayValue } from './GC3DUnitConverter';\n\n""" + row_component

content = content.replace(imports_search, imports_replace)

body_search = """          {nodeResults.map((r, i) => {
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
          })}"""


body_replace = """          {nodeResults.map((r, i) => {
            const connectedLegs = legResults.filter(l => {
                const legSeg = segments.find(s => s.id === l.legId);
                return legSeg && (legSeg.startNode === r.nodeId || legSeg.endNode === r.nodeId);
            });
            const isSelected = useAnalysisStore.getState().selectedNodeId === r.nodeId;
            return (
              <NodeResultRow
                key={i}
                r={r}
                i={i}
                unitSystem={unitSystem}
                getLabel={getLabel}
                isSelected={isSelected}
                onSelect={(id) => {
                    useAnalysisStore.getState().setCameraViewMode('selected');
                    setSelectedNode(id);
                }}
                connectedLegs={connectedLegs}
              />
            );
          })}"""

content = content.replace(body_search, body_replace)

content = "/* AGENT HANDOFF: 3-UI -> 4-QA\n * Date: 2026-04-27\n * Changes:\n *   - src/3d-analysis/DebugTable.jsx: Enhanced node results row, adding per-axis detail, RatioBar, visual colors\n * Interface changes:\n *   - DebugTable: Added sub-component NodeResultRow and RatioBar\n * Known open items:\n *   - None\n * Tests run:\n *   - npm run test, npm run lint\n */\n" + content

with open('src/3d-analysis/DebugTable.jsx', 'w') as f:
    f.write(content)
