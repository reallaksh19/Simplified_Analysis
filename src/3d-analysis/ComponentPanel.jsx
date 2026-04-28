/* AGENT HANDOFF: 3-UI -> 4-QA
 * Date: 2026-04-27
 * Changes:
 *   - src/3d-analysis/ComponentPanel.jsx: Use Field component to display units for numerical values.
 * Interface changes:
 *   - ComponentPanel: added Field component
 * Known open items:
 *   - None
 * Tests run:
 *   - npm run test, npm run lint
 */
import React from 'react';
import { useAnalysisStore } from './AnalysisStore';


const Field = ({ label, value, unit }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '0.8rem' }}>
    <span style={{ color: '#94a3b8' }}>{label}</span>
    <span style={{ color: '#f1f5f9', fontFamily: 'monospace' }}>
      {value != null ? value : '—'}
      {unit && <span style={{ color: '#64748b', marginLeft: '4px' }}>{unit}</span>}
    </span>
  </div>
);

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
                <Field label="Length" value={(firstSeg.length_in || 0).toFixed(2)} unit="in" />
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
            <label style={{ fontSize: '12px', color: '#94a3b8' }}>Outside Diameter</label>
            <input type="number" step="0.1" name="od_in" value={firstSeg.od_in || ''} onChange={handleChange} style={inputStyle} />
            <Field label="Outside Diameter"  value={firstSeg.od_in?.toFixed(3)}  unit="in" />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#94a3b8' }}>Wall Thickness</label>
            <input type="number" step="0.01" name="wt_in" value={firstSeg.wt_in || ''} onChange={handleChange} style={inputStyle} />
            <Field label="Wall Thickness"    value={firstSeg.wt_in?.toFixed(4)}  unit="in" />
          </div>

          <div style={{ marginBottom: '16px' }}>
             <Field label="Length"            value={firstSeg.length_in?.toFixed(1)} unit="in" />
             <Field label="Moment of Inertia" value={firstSeg.segProps?.I?.toFixed(4) || (firstSeg.od_in && firstSeg.wt_in ? (Math.PI/64*(Math.pow(firstSeg.od_in, 4) - Math.pow(firstSeg.od_in - 2*firstSeg.wt_in, 4))).toFixed(4) : null)} unit="in⁴" />
             <Field label="Section Modulus"   value={firstSeg.segProps?.Z?.toFixed(4) || (firstSeg.od_in && firstSeg.wt_in ? (Math.PI/32*(Math.pow(firstSeg.od_in, 4) - Math.pow(firstSeg.od_in - 2*firstSeg.wt_in, 4))/firstSeg.od_in).toFixed(4) : null)} unit="in³" />
          </div>

          {data && selectedSegmentIds.size === 1 && (
            <>
              <div style={{ marginTop: '16px', borderTop: '1px solid #334155', paddingTop: '16px', fontWeight: 'bold', marginBottom: '8px' }}>SIF Data</div>
              <Field label="Flexibility h"    value={data.h?.toFixed(3)} unit="" />
              <Field label="In-plane SIF (i_i)" value={data.i_i?.toFixed(3)} unit="" />
              <Field label="Flexibility factor k" value={data.k?.toFixed(3)} unit="" />
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
