import React from 'react';
import { useAnalysisStore } from './AnalysisStore';

const box = { border: '1px solid #334155', borderRadius: 8, padding: 10, background: '#020617', color: '#cbd5e1', fontSize: 12, marginBottom: 8 };
const btn = { background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', borderRadius: 4, padding: '5px 8px', cursor: 'pointer', marginRight: 6 };

export default function SimplifiedCalculationSuitePanel() {
  const runThermal = useAnalysisStore((s) => s.runGuidedCantileverThermalCalculation);
  const runSuite = useAnalysisStore((s) => s.run3DSimplifiedCalculationSuite);
  const thermal = useAnalysisStore((s) => s.guidedCantileverThermalResult);
  const suite = useAnalysisStore((s) => s.simplified3DSuiteResult);

  return (
    <div data-testid="3d-simplified-suite-panel" style={box}>
      <div style={{ color: '#93c5fd', fontWeight: 700 }}>3D Simplified Suite</div>
      <button data-testid="3d-run-guided-cantilever-thermal" style={btn} onClick={runThermal}>Run Thermal GC</button>
      <button data-testid="3d-run-simplified-suite" style={btn} onClick={runSuite}>Run Full Suite</button>
      <div data-testid="3d-suite-status-summary" style={{ marginTop: 6 }}>
        Thermal: {thermal?.status || 'NOT_RUN'} | Suite: {suite?.status || 'NOT_RUN'}
      </div>
    </div>
  );
}
