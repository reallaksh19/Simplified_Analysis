import React, { useEffect } from 'react';
import { SimpAnalysisCanvas } from './SimpAnalysisCanvas';
import { CalculationsPanel } from './CalculationsPanel';
import { useSimpStore } from './store';
import { extractSubGraph } from './smart2Dconverter';
import { useAppStore } from '../store/appStore';
import { canonicalToSimplified2D } from '../core/geometry/adapters/canonicalToSimplified2D';

export const SimpAnalysisTab = () => {
  const setSimplifiedPayload = useSimpStore(state => state.setSimplifiedPayload);
  const setNodes = useSimpStore(state => state.setNodes);
  const setSegments = useSimpStore(state => state.setSegments);
  const setPlane = useSimpStore(state => state.setPlane);
  const plane = useSimpStore(state => state.plane);
  const result = useSimpStore(state => state.result);
  const components = useAppStore(state => state.components);
  const analysisPayload = useAppStore(state => state.analysisPayload);
  const simplifiedGeometry = useAppStore(state => state.simplifiedGeometry);
  const activeCanonicalGeometry = useAppStore(state => state.activeCanonicalGeometry || state.canonicalGeometry);

  // Phase 3: consume explicit solver-ready simplified payload first, canonical fallback second.
  useEffect(() => {
    if (simplifiedGeometry?.schemaVersion === 'simplified-2d-v1' && simplifiedGeometry?.segments?.length) {
      setSimplifiedPayload(simplifiedGeometry);
      return;
    }

    if (analysisPayload?.schemaVersion === 'simplified-2d-v1' && analysisPayload?.segments?.length) {
      setSimplifiedPayload(analysisPayload);
      return;
    }

    if (activeCanonicalGeometry?.segments?.length) {
      setSimplifiedPayload(canonicalToSimplified2D(activeCanonicalGeometry, { source: 'simp-analysis-fallback', plane }));
      return;
    }

    const graph = extractSubGraph(components);
    setNodes(graph.nodes);
    setSegments(graph.segments);
  }, [analysisPayload, simplifiedGeometry, activeCanonicalGeometry, components, plane, setSimplifiedPayload, setNodes, setSegments]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ height: '58px', background: '#1e1e1e', color: 'white', display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid #333' }}>
        <h2 style={{ margin: 0, fontSize: '18px', marginRight: '20px' }}>Smart 2D Analyzer (Screening)</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '12px', color: '#aaa' }}>Analysis Plane:</label>
          <select
            value={plane}
            onChange={(e) => setPlane(e.target.value)}
            style={{ padding: '5px', background: '#2c2c2c', color: 'white', border: '1px solid #555' }}
          >
            <option value="XY">XY Plane (Plan)</option>
            <option value="XZ">XZ Plane (Elevation)</option>
            <option value="YZ">YZ Plane (Elevation)</option>
          </select>
          <span style={{ fontSize: '11px', color: '#aaa' }}>
            Source: {simplifiedGeometry?.source || analysisPayload?.source || activeCanonicalGeometry?.source || 'fallback'} | Type: {result?.classification?.geometryType || result?.geometryType || 'UNKNOWN'}
          </span>
          <span style={{ fontSize: '11px', color: '#fbbf24' }}>
            Screening only — not final code stress analysis
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}><SimpAnalysisCanvas /></div>
        </div>
        <CalculationsPanel />
      </div>
    </div>
  );
};

export default SimpAnalysisTab;
