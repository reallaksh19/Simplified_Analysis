import React from 'react';
import { useAnalysisStore } from './AnalysisStore';

const box = { border: '1px solid #334155', borderRadius: 8, padding: 10, background: '#020617', color: '#cbd5e1', fontSize: 12, marginBottom: 8 };
const input = { background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', borderRadius: 4, padding: '4px 6px', width: '100%' };

export default function CalculationAssignmentPanel() {
  const model = useAnalysisStore((s) => s.calculationModel);
  const selected = useAnalysisStore((s) => s.selectedCalculationElement);
  const setSelected = useAnalysisStore((s) => s.setSelectedCalculationElement);
  const updateSegment = useAnalysisStore((s) => s.updateCalculationSegment);
  const validate = useAnalysisStore((s) => s.validateCalculationAssignments);
  const diagnostics = useAnalysisStore((s) => s.calculationAssignmentDiagnostics || []);

  const segment = selected?.type === 'segment'
    ? (model?.segments || []).find((item) => item.id === selected.id)
    : null;

  if (!model) {
    return <div data-testid="3d-calculation-assignment-panel" style={box}>No 3D calculation model imported.</div>;
  }

  const patchSegment = (patch) => segment && updateSegment(segment.id, patch);

  return (
    <div data-testid="3d-calculation-assignment-panel" style={box}>
      <div style={{ color: '#93c5fd', fontWeight: 700, marginBottom: 6 }}>3D Calculation Assignment</div>

      <select
        data-testid="3d-assignment-selector"
        style={input}
        value={selected?.id || ''}
        onChange={(event) => setSelected(event.target.value ? { type: 'segment', id: event.target.value } : null)}
      >
        <option value="">Select segment...</option>
        {(model.segments || []).map((seg) => (
          <option key={seg.id} value={seg.id}>{seg.id} — {seg.type || seg.properties?.type || 'PIPE'}</option>
        ))}
      </select>

      {segment && (
        <div data-testid="3d-segment-assignment-editor" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
          <label>Wall mm<input data-testid="3d-segment-wall" style={input} type="number" value={segment.pipe?.wall_mm ?? segment.properties?.wt ?? ''} onChange={(e) => patchSegment({ pipe: { ...(segment.pipe || {}), wall_mm: Number(e.target.value) }, properties: { ...(segment.properties || {}), wt: Number(e.target.value) } })} /></label>
          <label>Temp °C<input data-testid="3d-segment-design-temperature" style={input} type="number" value={segment.operating?.designTemperature_C ?? ''} onChange={(e) => patchSegment({ operating: { ...(segment.operating || {}), designTemperature_C: Number(e.target.value) } })} /></label>
          <label>Pressure barg<input data-testid="3d-segment-design-pressure" style={input} type="number" value={segment.operating?.designPressure_barg ?? ''} onChange={(e) => patchSegment({ operating: { ...(segment.operating || {}), designPressure_barg: Number(e.target.value) } })} /></label>
          <label>Fluid kg/m³<input data-testid="3d-segment-fluid-density" style={input} type="number" value={segment.contents?.fluidDensity_kg_m3 ?? ''} onChange={(e) => patchSegment({ contents: { ...(segment.contents || {}), fluidDensity_kg_m3: Number(e.target.value) } })} /></label>
          <label>Insul mm<input data-testid="3d-segment-insulation-thickness" style={input} type="number" value={segment.insulation?.thickness_mm ?? ''} onChange={(e) => patchSegment({ insulation: { ...(segment.insulation || {}), thickness_mm: Number(e.target.value) } })} /></label>
        </div>
      )}

      <button data-testid="3d-validate-assignments" style={{ ...input, marginTop: 8, cursor: 'pointer' }} onClick={validate}>Validate assignments</button>

      {diagnostics.length > 0 && (
        <ul style={{ color: '#fde68a', paddingLeft: 18 }}>
          {diagnostics.slice(0, 8).map((item, index) => <li key={`${item.code}-${index}`}>{item.code}: {item.message}</li>)}
        </ul>
      )}
    </div>
  );
}
