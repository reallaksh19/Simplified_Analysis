import { create } from 'zustand';
import { buildGraphFromComponents, buildComponentsFromGraph } from './GraphTranslator';
import { sketcherToCanonicalGeometry, canonicalGeometryToSketcher } from '../core/geometry/adapters/sketcherToCanonicalGeometry';
import { convertSelectedNodeToBend, convertSelectedNodeToTee, convertSelectedNodeToOlet, autoConnectPipes as autoConnectPipesCmd, validateSketchCommand } from './commands/professionalDraftingCommands.js';
import { exportSketchGraphToPCFX, importPCFXToSketchGraph, validatePCFXRoundtrip } from '../core/pcfx/pcfxRoundtripAdapter.js';
import { serializePCFX, parsePCFXText, downloadTextFile, makePCFXFilename } from '../core/pcfx/pcfxFileUtils.js';
import { convertViewerComponentsToSketcher } from './adapters/viewerToSketcherAdapter.js';

export const useSketchStore = create((set, get) => ({
  history: { past: [], future: [] },
  saveSnapshot: () => set((state) => {
      const snapshot = {
          nodes: JSON.parse(JSON.stringify(state.nodes)),
          segments: JSON.parse(JSON.stringify(state.segments))
      };
      return {
          history: {
              past: [...state.history.past, snapshot],
              future: []
          }
      };
  }),

  undo: () => set((state) => {
      if (state.history.past.length === 0) return state;
      const past = [...state.history.past];
      const previousState = past.pop();
      const currentSnapshot = { nodes: state.nodes, segments: state.segments };
      return {
          nodes: previousState.nodes,
          segments: previousState.segments,
          history: { past, future: [...state.history.future, currentSnapshot] }
      };
  }),

  redo: () => set((state) => {
      if (state.history.future.length === 0) return state;
      const future = [...state.history.future];
      const nextState = future.pop();
      const currentSnapshot = { nodes: state.nodes, segments: state.segments };
      return {
          nodes: nextState.nodes,
          segments: nextState.segments,
          history: { past: [...state.history.past, currentSnapshot], future }
      };
  }),

  nodes: {},
  segments: [],
  workingPlane: 'XY', // 'XY', 'XZ', 'YZ'
  workingElevation: 0,
  activeTool: 'select', // 'select', 'draw_pipe', 'add_node'
  snapToGrid: true,

  draftingState: { isDrawing: false, startNodeId: null, currentPos: null },
  snapNodeId: null, // OSnap feature: ID of the node currently hovered for snapping
  setSnapNodeId: (id) => set({ snapNodeId: id }),
  gridSize: 100,

  designTemperature: 450, // Global default temperature (F)
  setDesignTemperature: (temp) => set({ designTemperature: temp }),

  topologyDiagnostics: null,
  showTopologyDiagnostics: false,
  lastDraftingCommand: null,
  topologyValidationSummary: null,

  setWorkingPlane: (plane) => set({ workingPlane: plane, draftingState: { isDrawing: false, startNodeId: null, currentPos: null } }),
  setActiveTool: (tool) => set({ activeTool: tool, draftingState: { isDrawing: false, startNodeId: null, currentPos: null } }),
  setDraftingState: (newState) => set(s => ({ draftingState: { ...s.draftingState, ...newState } })),
  
  importWarnings: [],
  lastImportDiagnostics: [],
  lastImportLossContract: [],
  clearWarnings: () => set({ importWarnings: [] }),

  autoCenterTrigger: 0,
  triggerAutoCenter: () => set(s => ({ autoCenterTrigger: s.autoCenterTrigger + 1 })),

  // Annotation Settings
  annotationScale: 1.0,
  showNodeLabels: true,
  showLengthLabels: true,
  showNodeCoordinates: true,
  showGrid: true,
  labelOpacity: 0.75,
  gridOpacity: 0.32,
  measureMode: false,
  setAnnotationScale: (scale) => set({ annotationScale: scale }),
  toggleNodeLabels: () => set(s => ({ showNodeLabels: !s.showNodeLabels })),
  toggleLengthLabels: () => set(s => ({ showLengthLabels: !s.showLengthLabels })),
  toggleNodeCoordinates: () => set(s => ({ showNodeCoordinates: !s.showNodeCoordinates })),
  toggleGrid: () => set(s => ({ showGrid: !s.showGrid })),
  setLabelOpacity: (labelOpacity) => set({ labelOpacity }),
  setGridOpacity: (gridOpacity) => set({ gridOpacity }),
  setMeasureMode: (measureMode) => set({ measureMode }),

  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id, selectedSegmentId: null }),
  updateNode: (id, updates, skipSnapshot = false) => {
      if (!skipSnapshot) {
          get().saveSnapshot();
      }
      set((s) => ({
          nodes: { ...s.nodes, [id]: { ...s.nodes[id], ...updates } }
      }));
  },

  deleteNode: (id) => {
      get().saveSnapshot();
      set((s) => {
          const newNodes = { ...s.nodes };
          delete newNodes[id];
          const newSegments = s.segments.filter(seg => seg.startNode !== id && seg.endNode !== id);
          return {
              nodes: newNodes,
              segments: newSegments,
              selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId
          };
      });
  },

  selectedSegmentId: null,
  setSelectedSegmentId: (id) => set({ selectedSegmentId: id, selectedNodeId: null }),
  updateSegment: (id, updates) => {
      get().saveSnapshot();
      set((s) => ({
          segments: s.segments.map(seg => seg.id === id ? { ...seg, ...updates } : seg)
      }));
  },
  deleteSegment: (id) => {
      get().saveSnapshot();
      set((s) => ({
          segments: s.segments.filter(seg => seg.id !== id),
          selectedSegmentId: null,
      }));
  },

  selectedItems: { nodes: [], segments: [] },
  setSelectedItems: (items) => set({ selectedItems: items }),

  importFromComponents: (components) => {
      get().importFromViewerComponents(components);
  },

  importFromViewerComponents: (components, options = {}) => {
      get().saveSnapshot();
      const result = convertViewerComponentsToSketcher(components, {
          source: options.source || 'viewer-components',
          toleranceMm: options.toleranceMm ?? 1.0,
      });

      set({
          nodes: result.nodes || {},
          segments: result.segments || [],
          importWarnings: (result.diagnostics || []).map((item) => item.message || String(item)),
          lastImportDiagnostics: result.diagnostics || [],
          lastImportLossContract: result.lossContract || [],
          topologyDiagnostics: result.diagnostics || [],
          showTopologyDiagnostics: (result.diagnostics || []).length > 0,
          lastDraftingCommand: 'IMPORT_VIEWER_TO_SKETCHER',
      });

      get().triggerAutoCenter();
      return result;
  },

  importFromCanonicalGeometry: (geometry) => {
      get().saveSnapshot();
      const { nodes, segments, warnings } = canonicalGeometryToSketcher(geometry);
      set({ nodes, segments, importWarnings: warnings || [] });
  },

  exportToCanonicalGeometry: () => {
      const { nodes, segments, workingPlane } = get();
      return sketcherToCanonicalGeometry(nodes, segments, { source: 'sketcher', unit: 'mm', plane: workingPlane });
  },

  exportToComponents: () => {
      const { nodes, segments } = get();
      return buildComponentsFromGraph(nodes, segments);
  },

  // Geometric Actions
  createNode: (pos, type = 'free') => {
      get().saveSnapshot();
      const { nodes } = get();

      let maxNum = 0;
      Object.keys(nodes).forEach(key => {
          if (key.startsWith('N')) {
              const num = parseInt(key.slice(1), 10);
              if (!isNaN(num) && num > maxNum) maxNum = num;
          }
      });

      const nextNumStr = String(maxNum + 1).padStart(3, '0');
      const id = `N${nextNumStr}`;

      set(s => ({ nodes: { ...s.nodes, [id]: { pos, type } } }));
      return id;
  },

  createSegment: (startNodeId, endNodeId, properties = {}) => {
      get().saveSnapshot();
      const { segments } = get();

      let maxNum = 0;
      segments.forEach(seg => {
          if (seg.id.startsWith('S')) {
              const num = parseInt(seg.id.slice(1), 10);
              if (!isNaN(num) && num > maxNum) maxNum = num;
          }
      });

      const nextNumStr = String(maxNum + 1).padStart(3, '0');
      const id = `S${nextNumStr}`;

      set(s => ({ segments: [...s.segments, { id, startNode: startNodeId, endNode: endNodeId, ...properties }] }));
      return id;
  },

  snapCoordinate: (val) => {
      const { snapToGrid, gridSize } = get();
      if (!snapToGrid) return val;
      return Math.round(val / gridSize) * gridSize;
  },

  resolve3DPoint: (point2D) => {
      const { workingPlane, workingElevation, snapCoordinate } = get();
      const x = snapCoordinate(point2D.x);
      const y = snapCoordinate(point2D.y);
      const z = snapCoordinate(point2D.z);
      
      if (workingPlane === 'XY') return [x, y, workingElevation];
      if (workingPlane === 'XZ') return [x, workingElevation, z];
      if (workingPlane === 'YZ') return [workingElevation, y, z];
      return [x, y, z];
  },
  
  clearSketch: () => {
      get().saveSnapshot();
      set({ nodes: {}, segments: [] });
  },

  exportSketch: () => {
      const { nodes, segments, workingPlane, workingElevation } = get();
      const data = { version: 1, workingPlane, workingElevation, nodes, segments };
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sketch_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
  },

  importSketch: (jsonText) => {
      try {
          const data = JSON.parse(jsonText);
          if (!data.nodes || !data.segments) throw new Error('Invalid sketch file — missing nodes or segments.');
          get().saveSnapshot();
          set({
              nodes: data.nodes,
              segments: data.segments,
              workingPlane: data.workingPlane || 'XY',
              workingElevation: data.workingElevation ?? 0,
              importWarnings: [],
          });
          get().triggerAutoCenter();
      } catch (e) {
          alert(`Failed to import sketch: ${e.message}`);
      }
  },

  setShowTopologyDiagnostics: (show) => set({ showTopologyDiagnostics: show }),

  applyDraftingCommandResult: (result) => set({
    nodes: result.nodes || get().nodes,
    segments: result.segments || get().segments,
    topologyDiagnostics: result.diagnostics || [],
    lastDraftingCommand: result.command || null,
    topologyValidationSummary: result.meta?.validationSummary || null,
    showTopologyDiagnostics: true,
  }),

  convertSelectedToBend: () => {
    const { nodes, segments, selectedNodeId } = get();
    const result = convertSelectedNodeToBend({ nodes, segments, selectedNodeId });
    get().applyDraftingCommandResult(result);
  },

  convertSelectedToTee: () => {
    const { nodes, segments, selectedNodeId } = get();
    const result = convertSelectedNodeToTee({ nodes, segments, selectedNodeId });
    get().applyDraftingCommandResult(result);
  },

  convertSelectedToOlet: () => {
    const { nodes, segments, selectedNodeId } = get();
    const result = convertSelectedNodeToOlet({ nodes, segments, selectedNodeId });
    get().applyDraftingCommandResult(result);
  },

  autoConnectPipes: (toleranceMm = 1.0) => {
    const { nodes, segments } = get();
    const result = autoConnectPipesCmd({ nodes, segments, toleranceMm });
    get().applyDraftingCommandResult(result);
  },

  validateTopology: () => {
    const { nodes, segments } = get();
    const result = validateSketchCommand({ nodes, segments });
    get().applyDraftingCommandResult(result);
  },

  lastPCFXRoundtrip: null,

  exportToPCFXObject: () => {
    const { nodes, segments } = get();
    return exportSketchGraphToPCFX({ nodes, segments, project: { id: 'SIMPLIFIED_ANALYSIS_SKETCH', name: 'Simplified Analysis Sketch' }, units: { length: 'mm' } });
  },

  exportToPCFXFile: () => {
    const pcfx = get().exportToPCFXObject();
    const text = serializePCFX(pcfx);
    downloadTextFile(makePCFXFilename('simplified-analysis-sketch'), text, 'application/json');
    set({ lastPCFXRoundtrip: pcfx, showTopologyDiagnostics: true, lastDraftingCommand: 'EXPORT_PCFX', topologyDiagnostics: pcfx.diagnostics || [] });
  },

  importFromPCFXText: (text) => {
    const parsed = parsePCFXText(text);
    if (!parsed.ok) {
      set({ topologyDiagnostics: [{ severity: 'error', code: parsed.diagnostic?.code || 'PCFX_PARSE_FAILED', message: parsed.diagnostic?.message || 'Failed to parse PCFX.' }], showTopologyDiagnostics: true, lastDraftingCommand: 'IMPORT_PCFX_FAILED' });
      return;
    }
    const result = importPCFXToSketchGraph(parsed.pcfx);
    set({ nodes: result.nodes, segments: result.segments, topologyDiagnostics: result.diagnostics || [], showTopologyDiagnostics: true, lastDraftingCommand: 'IMPORT_PCFX' });
  },

  runPCFXRoundtripCheck: () => {
    const pcfx = get().exportToPCFXObject();
    const imported = importPCFXToSketchGraph(pcfx);
    const validation = validatePCFXRoundtrip({ nodes: pcfx.nodes, segments: pcfx.segments }, imported);
    set({ lastPCFXRoundtrip: { pcfx, imported, validation }, topologyDiagnostics: [...(pcfx.diagnostics || []), ...(validation.errors || [])], showTopologyDiagnostics: true, lastDraftingCommand: 'ROUNDTRIP_PCFX' });
  },

  // Centralized interaction handler for the canvas
  handleInteractionClick: (ePoint, targetNodeId, shiftKey, isAltHeld) => {
      const state = get();
      const { activeTool, draftingState, resolve3DPoint, createNode, createSegment, setSelectedNodeId, updateNode, nodes } = state;

      let targetId = null;
      let pt3D;

      if (targetNodeId && nodes[targetNodeId] && !shiftKey) {
          // Snapped to an existing node
          targetId = targetNodeId;
          pt3D = nodes[targetNodeId].pos;
      } else {
          // Free space click
          if ((shiftKey || isAltHeld) && draftingState.isDrawing && draftingState.currentPos) {
              if (isAltHeld) {
                  pt3D = [
                      state.snapCoordinate(draftingState.currentPos.x),
                      state.snapCoordinate(draftingState.currentPos.y),
                      state.snapCoordinate(draftingState.currentPos.z)
                  ];
              } else {
                  pt3D = resolve3DPoint(ePoint);

                  if (shiftKey && state.draftingState.currentPos) {
                      const start = resolve3DPoint(state.draftingState.currentPos);
                      if (start) {
                          let dx = 0, dy = 0;

                          if (state.workingPlane === 'XY') {
                              dx = Math.abs(pt3D[0] - start[0]);
                              dy = Math.abs(pt3D[1] - start[1]);
                              if (dx > dy) pt3D[1] = start[1];
                              else pt3D[0] = start[0];
                          } else if (state.workingPlane === 'XZ') {
                              dx = Math.abs(pt3D[0] - start[0]);
                              dy = Math.abs(pt3D[2] - start[2]);
                              if (dx > dy) pt3D[2] = start[2];
                              else pt3D[0] = start[0];
                          } else if (state.workingPlane === 'YZ') {
                              dx = Math.abs(pt3D[1] - start[1]);
                              dy = Math.abs(pt3D[2] - start[2]);
                              if (dx > dy) pt3D[2] = start[2];
                              else pt3D[1] = start[1];
                          }
                      }
                  }
              }
          } else {
              pt3D = resolve3DPoint(ePoint);
          }
      }

      if (activeTool === 'select') {
           if (targetId) setSelectedNodeId(targetId);
           else setSelectedNodeId(null);
      } else if (activeTool === 'add_node') {
          if (!targetId) {
              createNode(pt3D, 'anchor');
          } else {
              // Convert existing node to anchor
              updateNode(targetId, { type: 'anchor' });
          }
      }
      else if (activeTool === 'draw_pipe') {
          if (!draftingState.isDrawing) {
              // First click: start drawing
              const startId = targetId || createNode(pt3D, 'free');
              const nextPos = { x: pt3D[0], y: pt3D[1], z: pt3D[2] };
              set(s => ({ draftingState: { ...s.draftingState, isDrawing: true, startNodeId: startId, currentPos: nextPos } }));
          } else {
              // Second click: end drawing, create segment, continue from new node
              // Do not allow zero length segments (clicking on start node)
              if (targetId && targetId === draftingState.startNodeId) return;

              const endId = targetId || createNode(pt3D, 'free');
              createSegment(draftingState.startNodeId, endId, { type: 'PIPE', bore: 100, material: 'CARBON STEEL' });

              // Continue drawing from the new end node
              const nextPos = { x: pt3D[0], y: pt3D[1], z: pt3D[2] };
              set(s => ({ draftingState: { ...s.draftingState, startNodeId: endId, currentPos: nextPos } }));
          }
      }
  }
}));

// E2E hook — only exposed when window.__SIMPLIFIED_ANALYSIS_E2E__ is true
if (typeof window !== 'undefined' && window.__SIMPLIFIED_ANALYSIS_E2E__) {
  window.__SIMPLIFIED_ANALYSIS_SKETCHER_STORE__ = useSketchStore;
}
