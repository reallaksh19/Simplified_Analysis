import React from 'react';
import { useSketchStore } from './SketcherStore';

const panelStyle = {
  border: '1px solid #334155',
  borderRadius: '8px',
  padding: '8px',
  background: '#020617',
  color: '#cbd5e1',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  width: '100%',
};

const titleStyle = {
  fontSize: '10px',
  color: '#93c5fd',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  fontWeight: 700,
};

const rowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '8px',
  fontSize: '11px',
};

function ToggleRow({ testId, label, checked, onChange }) {
  return (
    <label style={rowStyle}>
      <span>{label}</span>
      <input
        data-testid={testId}
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function RangeRow({ testId, label, value, onChange }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px' }}>
      <span>{label}: {Number(value ?? 0).toFixed(2)}</span>
      <input
        data-testid={testId}
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={Number(value ?? 0)}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export default function SketcherDisplaySettingsPanel() {
  const showNodeLabels = useSketchStore((s) => s.showNodeLabels);
  const showLengthLabels = useSketchStore((s) => s.showLengthLabels);
  const showNodeCoordinates = useSketchStore((s) => s.showNodeCoordinates ?? true);
  const labelOpacity = useSketchStore((s) => s.labelOpacity ?? 0.75);
  const gridOpacity = useSketchStore((s) => s.gridOpacity ?? 0.32);
  const measureMode = useSketchStore((s) => s.measureMode ?? false);

  const toggleNodeLabels = useSketchStore((s) => s.toggleNodeLabels);
  const toggleLengthLabels = useSketchStore((s) => s.toggleLengthLabels);
  const toggleNodeCoordinates = useSketchStore((s) => s.toggleNodeCoordinates);
  const setLabelOpacity = useSketchStore((s) => s.setLabelOpacity);
  const setGridOpacity = useSketchStore((s) => s.setGridOpacity);
  const setMeasureMode = useSketchStore((s) => s.setMeasureMode);

  return (
    <div data-testid="sketcher-display-settings-panel" style={panelStyle}>
      <div style={titleStyle}>Display</div>

      <ToggleRow testId="sketcher-toggle-node-labels" label="Node labels" checked={showNodeLabels} onChange={() => toggleNodeLabels()} />
      <ToggleRow testId="sketcher-toggle-node-coordinates" label="Coordinates" checked={showNodeCoordinates} onChange={() => toggleNodeCoordinates()} />
      <ToggleRow testId="sketcher-toggle-segment-lengths" label="Lengths" checked={showLengthLabels} onChange={() => toggleLengthLabels()} />
      <ToggleRow testId="sketcher-toggle-measure-mode" label="Measure mode" checked={measureMode} onChange={(checked) => setMeasureMode?.(checked)} />
      <RangeRow testId="sketcher-label-opacity" label="Label opacity" value={labelOpacity} onChange={(value) => setLabelOpacity?.(value)} />
      <RangeRow testId="sketcher-grid-opacity" label="Grid opacity" value={gridOpacity} onChange={(value) => setGridOpacity?.(value)} />
    </div>
  );
}
