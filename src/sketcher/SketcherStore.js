import { create } from 'zustand';
import { buildGraphFromComponents, buildComponentsFromGraph } from './GraphTranslator';
import { sketcherToCanonicalGeometry, canonicalGeometryToSketcher } from '../core/geometry/adapters/sketcherToCanonicalGeometry';

export const useSketchStore = create((set, get) => ({
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
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  updateNode: (id, updates) => set((s) => ({
      nodes: { ...s.nodes, [id]: { ...s.nodes[id], ...updates } }
  })),

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
  
  clearSketch: () => set({ nodes: {}, segments: [] }),

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
                  pt3D = resolve3DPoint(draftingState.currentPos);
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
