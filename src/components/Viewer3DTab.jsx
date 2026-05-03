import React, { useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';
import { useAnalysisStore } from '../3d-analysis';
import { useAppStore } from '../store/appStore';
import { PcfViewer3D } from '../utils/viewer3d';
import { parsePcfWithDiagnostics } from '../pcf/pcfParser';
import { serializePcf } from '../pcf/pcfSerializer';
import { log } from '../utils/logger';
import { mock5LegData } from '../mocks/mock5Leg';
import { useSketchStore } from '../sketcher/SketcherStore';

export const Viewer3DTab = () => {
  const components = useAppStore(state => state.components);
  const setComponents = useAppStore(state => state.setComponents);
  const pcfText = useAppStore(state => state.pcfText);
  const setPcfText = useAppStore(state => state.setPcfText);
  const toggleSelection = useAppStore(state => state.toggleSelection);
  const selectedIds = useAppStore(state => state.selectedIds);
  const setProcessingStage = useAppStore(state => state.setProcessingStage);
  const canonicalGeometry = useAppStore(state => state.canonicalGeometry);
  const geometryDiagnostics = useAppStore(state => state.geometryDiagnostics);

  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  // Status for selected geometry
  const selectedComps = components.filter(c => selectedIds.has(c.id));
  const numElements = selectedComps.length;
  const numBends = selectedComps.filter(c => c.type === 'ELBOW' || c.type === 'BEND').length;
  const numTees = selectedComps.filter(c => c.type === 'TEE').length;

  // Track whenever selection changes, log to stage1
  useEffect(() => {
    setProcessingStage('stage1', selectedComps);
  }, [selectedIds, components, setProcessingStage]);

  const loadMockData = () => {
    setComponents(mock5LegData);
    setPcfText('// Loaded Mock 5-Leg System');
    log('info', 'Viewer3DTab', 'Loaded mock5LegData for testing.');
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const text = await file.text();
    setPcfText(text); // Just load it into the textarea
    event.target.value = '';
  };

  const handleClear = () => {
    setPcfText('');
    setComponents([]);
  };

  const handleGenerate3D = () => {
    if (!pcfText.trim()) {
      alert("Please paste or load PCF text first.");
      return;
    }
    const parseResult = parsePcfWithDiagnostics(pcfText);
    const parsedComponents = parseResult.components;
    log('info', 'Viewer3DTab', `PCF parsed from text`, {
      count: parsedComponents.length,
      diagnostics: parseResult.diagnostics,
      summary: parseResult.summary,
    });

    if (parsedComponents.length > 0) {
      setComponents(parsedComponents);
    } else {
      alert("No valid pipe components found in PCF text.");
    }
  };

  const handleExportPcf = () => {
    if (!components.length) {
      alert("No components are available to export. Generate or load PCF first.");
      return;
    }

    const text = serializePcf(components);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'simplified-analysis-export.pcf';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    log('info', 'Viewer3DTab', 'Exported PCF from parsed components.', {
      componentCount: components.length,
      canonicalSummary: canonicalGeometry?.summary,
      diagnosticCount: geometryDiagnostics?.length || 0,
    });
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize viewer if not exists
    if (!viewerRef.current) {
      viewerRef.current = new PcfViewer3D(containerRef.current);
      viewerRef.current.onSelectToggle = (id) => {
        toggleSelection(id);
      };
    }

    // Pass data to viewer whenever components change
    if (viewerRef.current) {
      viewerRef.current.render(components);
      viewerRef.current.updateSelection(selectedIds);
    }

    // We no longer dispose the entire WebGL viewer on EVERY component update.
    // This was causing WebGL context loss bugs when navigating tabs and re-triggering state changes.
    // Instead, the viewer lifecycle matches the component mount cycle.
  }, [components]);

  useEffect(() => {
    return () => {
      if (viewerRef.current) {
        viewerRef.current.dispose();
        viewerRef.current = null;
      }
    };
  }, []);

  // Sync colorizer to state updates
  useEffect(() => {
    if (viewerRef.current) {
      viewerRef.current.updateSelection(selectedIds);
    }
  }, [selectedIds]);

  return (
    <div className="flex-1 flex flex-col bg-[#f0f2f5] overflow-hidden p-3 gap-3 h-full">

      {/* Main Split Layout container */}
      <div className="flex flex-row gap-3 flex-1 min-h-0 w-full">

        {/* Left Side: PCF Input Panel */}
        <div className="w-[320px] flex flex-col shrink-0 bg-white border border-slate-300 rounded overflow-hidden shadow-sm h-full">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#f8fafc] border-b border-slate-200">
            <span className="text-slate-600 font-semibold text-xs tracking-wider uppercase mr-auto mt-1">PCF Input</span>

            <button
              title="Load 5-Leg Mock Data"
              className="px-2 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs rounded cursor-pointer transition-colors shadow-sm"
              onClick={loadMockData}
            >
              Mock
            </button>

            <label
              title="Open a .pcf file from disk"
              className="px-2 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs rounded cursor-pointer transition-colors shadow-sm"
            >
              📂
              <input type="file" accept=".pcf,.txt" className="hidden" onChange={handleFileUpload} />
            </label>
            <button
              title="Clear scene and reset"
              className="px-2 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs rounded transition-colors shadow-sm"
              onClick={handleClear}
            >
              🗑
            </button>
          </div>

          <div className="flex-1 flex flex-col bg-white p-0 relative">
            <textarea
              value={pcfText}
              onChange={(e) => setPcfText(e.target.value)}
              placeholder="Paste PCF content here, or click 📂 to open a file..."
              className="absolute inset-0 w-full h-full bg-transparent text-[#21808e] font-mono text-[11px] leading-tight p-3 outline-none resize-none custom-scrollbar whitespace-pre"
            />
          </div>

          <div className="p-2 border-t border-slate-200 flex items-center bg-[#f8fafc]">
            <button
              onClick={handleGenerate3D}
              className="w-full px-3 py-1.5 bg-[#10b981] hover:bg-[#059669] text-white text-xs font-semibold rounded shadow-sm transition-colors"
            >
              ▶ Generate 3D
            </button>
          </div>
        </div>

        {/* Right Side: Visualization Panel */}
        <div className="flex-1 flex flex-col min-w-0 bg-white border border-slate-300 rounded shadow-sm overflow-hidden">

          {/* Top Viewer Toolbar */}
          <div className="flex items-center gap-1 px-3 py-2 bg-[#f8fafc] border-b border-slate-200">

            <div className="flex bg-slate-100 p-0.5 rounded border border-slate-300 mr-2">
              <button className="px-3 py-1 bg-[#ffa500] text-white shadow-sm rounded-sm text-[11px] font-bold flex items-center gap-1 cursor-default">
                <span className="text-[12px]">🧊</span> 3D View
              </button>
              <button
                onClick={() => useAppStore.getState().setActiveTab('datatable')}
                className="px-3 py-1 text-slate-500 hover:text-slate-700 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
              >
                <span className="text-[12px]">📊</span> 3DV Data Table
              </button>
              <button
                onClick={() => {
                  if (viewerRef.current && typeof viewerRef.current._fitCamera === 'function') {
                    viewerRef.current._fitCamera();
                  } else if (viewerRef.current && typeof viewerRef.current.fitCamera === 'function') {
                    viewerRef.current.fitCamera();
                  }
                }}
                className="px-3 py-1 text-slate-500 hover:text-slate-700 text-[11px] font-medium flex items-center gap-1 border-l border-slate-200 ml-1 pl-2 cursor-pointer"
              >
                <span>⊙</span> Auto center
              </button>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => {
                  if (containerRef.current) {
                    if (document.fullscreenElement) {
                      document.exitFullscreen();
                    } else {
                      containerRef.current.requestFullscreen();
                    }
                  }
                }}
                className="px-3 py-1 bg-white border border-slate-300 text-slate-600 text-[11px] rounded font-medium shadow-sm hover:bg-slate-50 flex items-center gap-1"
              >
                <span>⛶</span> Full Screen
              </button>
              <button
                onClick={handleExportPcf}
                className="px-3 py-1 bg-[#10b981] text-white text-[11px] rounded font-semibold shadow-sm hover:bg-[#059669]"
              >
                ↓ Export as PCF
              </button>

            <button
              onClick={() => {
                const targetComps = selectedIds.size > 0 
                  ? components.filter(c => selectedIds.has(c.id))
                  : components;
                const params = useAppStore.getState().processParams || {};
                useAnalysisStore.getState().importFromViewer(targetComps, params);
                useAppStore.getState().setActiveTab('3d-analysis');
              }}
              className="px-3 py-1 bg-blue-500 text-white text-[11px] rounded font-semibold shadow-sm hover:bg-blue-600 flex items-center gap-1"
              disabled={components.length === 0}
            >
              <Activity size={12} /> Send to GC 3D
            </button>

            <button
              onClick={() => {
                const sketchStore = useSketchStore.getState();
                const appState = useAppStore.getState();
                
                const proceed = () => {
                    const canonical = appState.activeCanonicalGeometry || appState.canonicalGeometry;
                    if (canonical?.segments?.length) {
                        sketchStore.importFromCanonicalGeometry(canonical);
                    } else if (appState.components.length > 0) {
                        sketchStore.importFromComponents(appState.components);
                    }
                    sketchStore.triggerAutoCenter();
                    appState.setActiveTab('sketcher');
                };

                if (Object.keys(sketchStore.nodes).length > 0) {
                    if (window.confirm("The Sketcher already contains geometry. Do you want to overwrite it with the current 3D Viewer model?")) {
                        proceed();
                    } else {
                        appState.setActiveTab('sketcher');
                    }
                } else {
                    proceed();
                }
              }}
              className="px-3 py-1 bg-[#8b5cf6] text-white text-[11px] rounded font-semibold shadow-sm hover:bg-[#7c3aed] flex items-center gap-1"
              disabled={components.length === 0}
            >
              <span className="text-[12px]">✎</span> Edit in 2D Sketcher
            </button>
            </div>
          </div>
          </div>

          {/* Status Bar */}
          <div className="px-3 py-1 bg-white border-b border-slate-100 flex justify-between">
            <div className="text-slate-600 text-[11px] font-medium flex gap-4">
               <span>Selected: {numElements} Elements</span>
               <span>Bends: {numBends}</span>
               <span>Tees: {numTees}</span>
            </div>
            <span className="text-[#10b981] text-[10px] font-medium">
              ✓ {components.length} components rendered · {canonicalGeometry?.summary?.nodeCount || 0} nodes · {canonicalGeometry?.summary?.segmentCount || 0} segments
              {geometryDiagnostics?.length ? ` · ${geometryDiagnostics.length} diagnostics` : ''}
            </span>
          </div>

          <div className="flex-1 relative bg-[#1c2030] overflow-hidden flex flex-row">

            <div
              ref={containerRef}
              className="flex-1 relative"
            >
              {/* Three.js canvas goes here */}
              {components.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-slate-500 text-xs font-medium bg-[#1c2030]/80 px-3 py-1.5 rounded">Paste PCF or open file, then click Generate 3D.</span>
                </div>
              )}
            </div>

            {/* Side Panel showing Selection Data */}
            {selectedComps.length > 0 && (
              <div className="w-[300px] border-l border-slate-700 bg-slate-800 text-slate-200 overflow-y-auto flex flex-col shrink-0 text-[11px]">
                <div className="p-2 border-b border-slate-700 font-bold bg-slate-900 sticky top-0 flex justify-between items-center">
                  <span>Selected Properties (MTO)</span>
                </div>
                <div className="p-2 flex flex-col gap-2">
                  {selectedComps.map((c, i) => (
                    <div key={i} className="bg-slate-700 p-2 rounded">
                      <div className="font-bold text-blue-300 border-b border-slate-600 pb-1 mb-1">{c.type} - {c.id || `C-${i}`}</div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1">
                        <span className="text-slate-400">Material:</span> <span>{c.attributes?.MATERIAL || c.attributes?.['ITEM-CODE'] || 'N/A'}</span>
                        <span className="text-slate-400">Coords:</span> <span className="truncate" title={JSON.stringify(c.points)}>
                          {c.points && c.points.length > 0 ? `[${c.points[0].x}, ${c.points[0].y}, ${c.points[0].z}]` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

export default Viewer3DTab;
