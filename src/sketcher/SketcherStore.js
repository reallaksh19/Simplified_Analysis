import { create } from 'zustand';
import { buildGraphFromComponents, buildComponentsFromGraph } from './GraphTranslator';
import { sketcherToCanonicalGeometry, canonicalGeometryToSketcher } from '../core/geometry/adapters/sketcherToCanonicalGeometry';

export const useSketchStore = create((set, get) => ({
  nodes: {},
  segments: [],
  history: { past: [], future: [] },
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

  setWorkingPlane: (plane) => set({ workingPlane: plane, draftingState: { isDrawing: false, startNodeId: null, currentPos: null } }),
  setActiveTool: (tool) => set({ activeTool: tool, draftingState: { isDrawing: false, startNodeId: null, currentPos: null } }),
  setDraftingState: (newState) => set(s => ({ draftingState: { ...s.draftingState, ...newState } })),
  
  importWarnings: [],
  clearWarnings: () => set({ importWarnings: [] }),

  autoCenterTrigger: 0,
  triggerAutoCenter: () => set(s => ({ autoCenterTrigger: s.autoCenterTrigger + 1 })),

  // Annotation Settings
  annotationScale: 1.0,
  showNodeLabels: true,
  showLengthLabels: true,
  setAnnotationScale: (scale) => set({ annotationScale: scale }),
  toggleNodeLabels: () => set(s => ({ showNodeLabels: !s.showNodeLabels })),
  toggleLengthLabels: () => set(s => ({ showLengthLabels: !s.showLengthLabels })),

  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id, selectedSegmentId: null }),
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

  updateNode: (id, updates) => {
      get().saveSnapshot();
      set((s) => ({
          nodes: { ...s.nodes, [id]: { ...s.nodes[id], ...updates } }
      }));
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
  deleteNode: (id) => {
      get().saveSnapshot();
      set((s) => {
          const newNodes = { ...s.nodes };
          delete newNodes[id];
          return { nodes: newNodes, selectedNodeId: null };
      });
  },

  selectedItems: { nodes: [], segments: [] },
  setSelectedItems: (items) => set({ selectedItems: items }),

  importFromComponents: (components) => {
      const { nodes, segments, warnings } = buildGraphFromComponents(components);
      set({ nodes, segments, importWarnings: warnings || [] });
  },

  importFromCanonicalGeometry: (geometry) => {
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

  // Centralized interaction handler for the canvas
  handleInteractionClick: (ePoint, targetNodeId, isShiftHeld, isAltHeld) => {
      const state = get();
      const { activeTool, draftingState, resolve3DPoint, createNode, createSegment, setSelectedNodeId, updateNode, nodes } = state;

      let targetId = null;
      let pt3D;

      if (targetNodeId && nodes[targetNodeId] && !isShiftHeld) {
          // Snapped to an existing node
          targetId = targetNodeId;
          pt3D = nodes[targetNodeId].pos;
      } else {
          // Free space click
          if ((isShiftHeld || isAltHeld) && draftingState.isDrawing && draftingState.currentPos) {
              if (isAltHeld) {
                  pt3D = [
                      state.snapCoordinate(draftingState.currentPos.x),
                      state.snapCoordinate(draftingState.currentPos.y),
                      state.snapCoordinate(draftingState.currentPos.z)
                  ];
              } else {
                  // Orthogonal Constraint Engine (Shift-to-Lock)
                  let targetPos = resolve3DPoint(ePoint);
                  const start = draftingState.currentPos;

                  if (isShiftHeld && start) {
                      if (state.workingPlane === 'XY') {
                          const dx = Math.abs(targetPos[0] - start.x);
                          const dy = Math.abs(targetPos[1] - start.y);
                          if (dx > dy) targetPos[1] = start.y;
                          else targetPos[0] = start.x;
                      } else if (state.workingPlane === 'XZ') {
                          const dx = Math.abs(targetPos[0] - start.x);
                          const dz = Math.abs(targetPos[2] - start.z);
                          if (dx > dz) targetPos[2] = start.z;
                          else targetPos[0] = start.x;
                      } else if (state.workingPlane === 'YZ') {
                          const dy = Math.abs(targetPos[1] - start.y);
                          const dz = Math.abs(targetPos[2] - start.z);
                          if (dy > dz) targetPos[2] = start.z;
                          else targetPos[1] = start.y;
                      }
                  }
                  pt3D = targetPos;
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
