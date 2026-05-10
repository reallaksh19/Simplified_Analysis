import React, { useMemo } from 'react';
import { useAnalysisStore } from './AnalysisStore';
import {
  build3DSimplifiedModelContract,
  build3DSimplifiedModelSummary,
  build3DSimplifiedPropertySummary,
  validate3DSimplifiedModelContract,
} from './model/3dSimplifiedModelContract.js';

const panelStyle = {
  borderBottom: '1px solid #334155',
  background: 'rgba(2, 6, 23, 0.72)',
  padding: '10px 12px',
  color: '#cbd5e1',
  fontSize: 12,
};

const badgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  border: '1px solid #475569',
  borderRadius: 999,
  padding: '2px 8px',
  fontSize: 11,
  color: '#e2e8f0',
  background: '#0f172a',
};

export function ModelContractPanel() {
  const nodes = useAnalysisStore((state) => state.nodes);
  const segments = useAnalysisStore((state) => state.segments);
  const fittingData = useAnalysisStore((state) => state.fittingData);
  const params = useAnalysisStore((state) => state.params);

  const model = useMemo(
    () =>
      build3DSimplifiedModelContract({
        nodes,
        segments,
        fittingData,
        params,
        source: '3d-analysis-store',
      }),
    [nodes, segments, fittingData, params]
  );

  const validation = useMemo(() => validate3DSimplifiedModelContract(model), [model]);
  const summary = useMemo(() => build3DSimplifiedModelSummary(model), [model]);
  const propertySummary = useMemo(() => build3DSimplifiedPropertySummary(model), [model]);

  return (
    <div data-testid="3d-simplified-model-contract-panel" style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <strong style={{ color: '#e0f2fe' }}>Model Contract</strong>

        <span data-testid="3d-simplified-model-validation-status" style={badgeStyle}>
          {validation.status}
        </span>
      </div>

      <div
        data-testid="3d-simplified-imported-model-summary"
        style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}
      >
        <span>Nodes: {summary.nodes}</span>
        <span>Segments: {summary.segments}</span>
        <span>Components: {summary.components}</span>
        <span>Supports: {summary.supports}</span>
      </div>

      <div
        data-testid="3d-simplified-property-contract-summary"
        style={{
          marginTop: 8,
          borderTop: '1px solid #1e293b',
          paddingTop: 8,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 4,
        }}
      >
        <span>Pipe segments: {propertySummary.pipeSegments}</span>
        <span>Component segments: {propertySummary.componentSegments}</span>
        <span>Materials: {propertySummary.materials.join(', ') || 'UNSPECIFIED'}</span>
        <span>Schedules: {propertySummary.schedules.join(', ') || 'UNSPECIFIED'}</span>
        <span>Ratings: {propertySummary.ratings.join(', ') || 'UNSPECIFIED'}</span>
        <span>Fluid density assigned: {propertySummary.segmentsWithFluidDensity}</span>
        <span>Insulation assigned: {propertySummary.segmentsWithInsulation}</span>
        <span>Component weights assigned: {propertySummary.segmentsWithComponentWeight}</span>
      </div>

      <details style={{ marginTop: 8 }}>
        <summary style={{ cursor: 'pointer', color: '#93c5fd' }}>Diagnostics</summary>
        <ul data-testid="3d-simplified-model-diagnostics" style={{ paddingLeft: 16, margin: '6px 0 0' }}>
          {validation.diagnostics.length === 0 ? (
            <li>No model-contract diagnostics.</li>
          ) : (
            validation.diagnostics.slice(0, 8).map((item, index) => (
              <li key={`${item.code}-${index}`}>
                {item.severity} / {item.code}: {item.message}
              </li>
            ))
          )}
        </ul>
      </details>

      <pre
        data-testid="3d-simplified-model-contract-json"
        style={{
          marginTop: 8,
          maxHeight: 110,
          overflow: 'auto',
          background: '#020617',
          border: '1px solid #1e293b',
          borderRadius: 6,
          padding: 8,
          fontSize: 10,
          color: '#94a3b8',
        }}
      >
        {JSON.stringify(
          {
            schemaVersion: model.schemaVersion,
            summary,
            propertySummary,
            status: validation.status,
          },
          null,
          2
        )}
      </pre>
    </div>
  );
}
