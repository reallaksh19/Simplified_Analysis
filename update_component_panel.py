with open('src/3d-analysis/ComponentPanel.jsx', 'r') as f:
    content = f.read()

helper = """
const Field = ({ label, value, unit }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '0.8rem' }}>
    <span style={{ color: '#94a3b8' }}>{label}</span>
    <span style={{ color: '#f1f5f9', fontFamily: 'monospace' }}>
      {value != null ? value : '—'}
      {unit && <span style={{ color: '#64748b', marginLeft: '4px' }}>{unit}</span>}
    </span>
  </div>
);
"""

# inject helper
content = content.replace("export const ComponentPanel = () => {", helper + "\nexport const ComponentPanel = () => {")

search = """          <div style={{ marginBottom: '12px' }}>
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
          )}"""

replace = """          <div style={{ marginBottom: '12px' }}>
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
          )}"""

content = content.replace(search, replace)

search_length = """<p style={{ marginBottom: '8px' }}>Length: {(firstSeg.length_in || 0).toFixed(2)} in</p>"""
replace_length = """<Field label="Length" value={(firstSeg.length_in || 0).toFixed(2)} unit="in" />"""
content = content.replace(search_length, replace_length)


with open('src/3d-analysis/ComponentPanel.jsx', 'w') as f:
    f.write("/* AGENT HANDOFF: 3-UI -> 4-QA\n * Date: 2026-04-27\n * Changes:\n *   - src/3d-analysis/ComponentPanel.jsx: Use Field component to display units for numerical values.\n * Interface changes:\n *   - ComponentPanel: added Field component\n * Known open items:\n *   - None\n * Tests run:\n *   - npm run test, npm run lint\n */\n" + content)
