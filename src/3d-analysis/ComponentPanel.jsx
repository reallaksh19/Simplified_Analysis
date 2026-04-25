import React from 'react';
import { useAnalysisStore } from './AnalysisStore';

export const ComponentPanel = () => {
  const selectedSegmentIds = useAnalysisStore(s => s.selectedSegmentIds);
  const segments = useAnalysisStore(s => s.segments);
  const fittingData = useAnalysisStore(s => s.fittingData);
  const updateSegmentProperty = useAnalysisStore(s => s.updateSegmentProperty);

  const selectedNodeId = useAnalysisStore(s => s.selectedNodeId);
  const nodes = useAnalysisStore(s => s.nodes);
  const nodeResults = useAnalysisStore(s => s.nodeResults);

  if (selectedSegmentIds.size > 0) {
    const firstSegId = Array.from(selectedSegmentIds)[0];
    const firstSeg = segments.find(s => s.id === firstSegId);
    if (!firstSeg) return null;
    const data = fittingData[firstSeg.id];

    const handleChange = (e) => {
      const { name, value } = e.target;
      let val = value;
      if (name === 'od_in' || name === 'wt_in') {
        val = parseFloat(value);
        if (isNaN(val)) return;
      }
      selectedSegmentIds.forEach(id => {
        updateSegmentProperty(id, { [name]: val });
      });
    };

    const inputStyle = {
      width: '100%',
      background: '#0f172a',
      border: '1px solid #334155',
      color: '#f8fafc',
      padding: '4px 8px',
      borderRadius: '4px',
      marginTop: '4px',
      fontSize: '12px'
    };

    return (
      <div style={{ width: '300px', background: '#1e293b', borderLeft: '1px solid #334155', display: 'flex', flexDirection: 'column', color: '#f8fafc' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #334155', fontWeight: 'bold' }}>Segment Properties {selectedSegmentIds.size > 1 ? `(${selectedSegmentIds.size} selected)` : ''}</div>
        <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
          {selectedSegmentIds.size === 1 && (
             <>
                <p style={{ marginBottom: '8px' }}>ID: <span style={{ color: '#38bdf8' }}>{firstSeg.id}</span></p>
                <p style={{ marginBottom: '8px' }}>Type: {firstSeg.compType}</p>
                <p style={{ marginBottom: '8px' }}>Length: {(firstSeg.length_in || 0).toFixed(2)} in</p>
                <p style={{ marginBottom: '16px' }}>Axis: {firstSeg.axis}</p>

                {/* Editable Deltas */}
                <div style={{ marginBottom: '16px', background: '#0f172a', padding: '8px', borderRadius: '4px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>Adjust End Node relative to Start (mm)</div>
                  {['x', 'y', 'z'].map((axis, i) => {
                     const startNode = nodes[firstSeg.startNode];
                     const endNode = nodes[firstSeg.endNode];
                     const val = startNode && endNode && startNode.pos && endNode.pos ? (endNode.pos[i] - startNode.pos[i]) : 0;
                     return (
                       <div key={axis} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                         <label style={{ width: '20px', color: '#cbd5e1', fontSize: '12px' }}>d{axis.toUpperCase()}</label>
                         <input
                           type="number"
                           value={(val || 0).toFixed(1)}
                           onChange={(e) => {
                             const newVal = parseFloat(e.target.value);
                             if (isNaN(newVal)) return;
                             const currentPos = startNode.pos;
                             const currentDeltas = [
                               endNode.pos[0] - currentPos[0],
                               endNode.pos[1] - currentPos[1],
                               endNode.pos[2] - currentPos[2]
                             ];
                             currentDeltas[i] = newVal;
                             useAnalysisStore.getState().adjustSegmentDelta(firstSeg.id, currentDeltas[0], currentDeltas[1], currentDeltas[2]);
                           }}
                           style={{ flex: 1, background: '#1e293b', border: '1px solid #475569', color: '#fff', padding: '2px 4px', fontSize: '12px' }}
                         />
                       </div>
                     );
                  })}
                </div>
             </>
          )}

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: '#94a3b8' }}>Material</label>
            <input name="material" value={firstSeg.material || ''} onChange={handleChange} style={inputStyle} />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: '#94a3b8' }}>Outside Diameter (in)</label>
            <input type="number" step="0.1" name="od_in" value={firstSeg.od_in || ''} onChange={handleChange} style={inputStyle} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#94a3b8' }}>Wall Thickness (in)</label>
            <input type="number" step="0.01" name="wt_in" value={firstSeg.wt_in || ''} onChange={handleChange} style={inputStyle} />
          </div>

          {data && selectedSegmentIds.size === 1 && (
            <>
              <div style={{ marginTop: '16px', borderTop: '1px solid #334155', paddingTop: '16px', fontWeight: 'bold', marginBottom: '8px' }}>SIF Data</div>
              <p style={{ fontSize: '13px', color: '#cbd5e1' }}>Flexibility h: {data.h?.toFixed(3)}</p>
              <p style={{ fontSize: '13px', color: '#cbd5e1' }}>In-plane SIF (i_i): {data.i_i?.toFixed(3)}</p>
              <p style={{ fontSize: '13px', color: '#cbd5e1' }}>Flexibility factor k: {data.k?.toFixed(3)}</p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (selectedNodeId) {
    const n = nodes[selectedNodeId];
    if (!n) return null;
    const res = nodeResults.find(r => r.nodeId === selectedNodeId);

    return (
      <div style={{ width: '300px', background: '#1e293b', borderLeft: '1px solid #334155', display: 'flex', flexDirection: 'column', color: '#f8fafc' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #334155', fontWeight: 'bold' }}>Node Properties</div>
        <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
          <p>ID: <span style={{ color: '#38bdf8' }}>{selectedNodeId}</span></p>
          <p>Type: {n.type}</p>
          <p>Pos: [{n.pos.map(p => (p || 0).toFixed(1)).join(', ')}] mm</p>

          {res && (
            <>
              <div style={{ marginTop: '16px', borderTop: '1px solid #334155', paddingTop: '16px', fontWeight: 'bold' }}>Analysis Result</div>
              <p>Combined Stress SE: {(res.SE_psi || 0).toFixed(0)} psi</p>
              <p>Allowable SA: {(res.SA_psi || 0).toFixed(0)} psi</p>
              <p>Ratio: {(res.ratio || 0).toFixed(3)}</p>
              <p>Status: <span style={{ color: res.result === 'PASS' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{res.result || 'UNKNOWN'}</span></p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '300px', background: '#1e293b', borderLeft: '1px solid #334155', display: 'flex', flexDirection: 'column', color: '#f8fafc', padding: '16px' }}>
      <p style={{ color: '#94a3b8' }}>Select a segment or node to view properties.</p>
    </div>
  );
};
