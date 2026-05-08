import { create } from 'zustand';
import { getSIFData } from './GC3DSIFEngine';
import { getMaterialProperties } from '../utils/materialUtils';
import { solveGC3D } from '../solvers/3d/solveGC3D.js';

const UNSUPPORTED_GC3D_SKETCHER_NODE_TYPES = new Set(['tee', 'branch', 'olet']);
const UNSUPPORTED_GC3D_SKETCHER_SEGMENT_TYPES = new Set(['TEE', 'BRANCH', 'OLET']);

function buildSketcherGC3DPreflight(nodes, segments) {
  const unsupportedNodes = Object.entries(nodes || {})
    .filter(([, node]) => UNSUPPORTED_GC3D_SKETCHER_NODE_TYPES.has(String(node?.type || '').toLowerCase()))
    .map(([id, node]) => ({ id, type: node.type }));

  const unsupportedSegments = (segments || [])
    .filter((segment) => UNSUPPORTED_GC3D_SKETCHER_SEGMENT_TYPES.has(String(segment?.compType || '').toUpperCase()))
    .map((segment) => ({ id: segment.id, compType: segment.compType }));

  if (!unsupportedNodes.length && !unsupportedSegments.length) {
    return { ok: true, status: 'READY_FOR_GC3D', diagnostics: [] };
  }

  const unsupportedSummary = [
    ...unsupportedNodes.map((item) => `${item.id}:${item.type}`),
    ...unsupportedSegments.map((item) => `${item.id}:${item.compType}`)
  ].join(', ');

  return {
    ok: false,
    status: 'UNSUPPORTED_GEOMETRY',
    diagnostics: [{
      step: 'GC3D_PREFLIGHT',
      msg: `Sketcher geometry contains tee/branch/olet topology not supported by deterministic GC3D screening: ${unsupportedSummary}`,
      sequence: 0,
      timestamp: 'gc3d-preflight-000'
    }]
  };
}

export const useAnalysisStore = create((set, get) => ({
  nodes: {},
  segments: [],
  includeSIF: true,
  activeSolver: 'GC3D',
  params: {
    deltaT_F: 380,
    installTemp_F: 70,
    designTemp_F: 450,
    E_psi: 27000000,
    alpha_in_in_F: 6.72e-6,
    Sc_psi: 20000,
    Sh_psi: 19400,
    f: 1.0,
    Sa_psi: 29850,
  },
  fittingData: {},
  legResults: [],
  nodeResults: [],
  criticalNode: null,
  overallResult: null,
  debugLog: [],
  logCounter: 0,
  splitCounter: 0,
  selectedSegmentIds: new Set(),
  selectedNodeId: null,
  activeSubTab: '3dview',
  colorMode: 'type', // 'type', 'material', 'od', 'wt'
  setColorMode: (mode) => set({ colorMode: mode }),
  activeTool: 'select', // 'select', 'anchor'
  setActiveTool: (tool) => set({ activeTool: tool, selectedSegmentIds: new Set(), selectedNodeId: null }),
  snapNodeId: null, // OSnap support for GC3D
  setSnapNodeId: (id) => set({ snapNodeId: id }),
  convertNodeToAnchor: (id) => {
    const { nodes } = get();
    if (nodes[id]) {
      set(s => ({
         nodes: {
            ...s.nodes,
            [id]: { ...s.nodes[id], type: 'anchor' }
         },
         activeTool: 'select', // Auto-switch back to select mode
         snapNodeId: null
      }));
      get().runAnalysis(); // Instantly trigger Pure Solver to recalculate constraints
    }
  },
  cameraViewMode: 'auto', // 'auto', 'top', 'iso', 'front', 'selected'
  setCameraViewMode: (mode) => set({ cameraViewMode: mode }),
  unitSystem: 'imperial',
  consoleCollapsed: false,
  dataGridCollapsed: false,
  toggleDataGrid: () => set(s => ({ dataGridCollapsed: !s.dataGridCollapsed })),
  config: {
    gridSnap_mm: 100,
    displayPrecision: { stress: 0, sif: 3, length: 1, force: 0 },
    defaultMaterial: 'Carbon steels, C ≤ 0.3%',
    sifMinimum: 1.0,
  },

  setNodes: (nodes) => set({ nodes }),
  setSegments: (segments) => { set({ segments }); get().runAnalysis(); },
  setIncludeSIF: (val) => { set({ includeSIF: val }); get().runAnalysis(); },
  setActiveSolver: (solver) => {
    if (solver !== 'GC3D') {
      get().log('SOLVER_GUARD', `Blocked unsupported 3D solver selection: ${solver}. Phase 1 allows deterministic GC3D only.`);
      set({ activeSolver: 'GC3D' });
      get().runAnalysis();
      return;
    }
    set({ activeSolver: 'GC3D' });
    get().runAnalysis();
  },
  setParams: (p) => {
    set(s => ({ params: { ...s.params, ...p } }));
    const { f, Sc_psi, Sh_psi } = { ...get().params, ...p };
    set(s => ({ params: { ...s.params, Sa_psi: f * (1.25 * Sc_psi + 0.25 * Sh_psi) } }));
    get().runAnalysis();
  },
  toggleSegmentSelection: (id, multi) => set((s) => {
    const newSelected = new Set(multi ? s.selectedSegmentIds : []);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    return { selectedSegmentIds: newSelected, selectedNodeId: null };
  }),
  setSelectedNode: (id) => set({ selectedNodeId: id, selectedSegmentIds: new Set() }),
  clearSelection: () => set({ selectedSegmentIds: new Set(), selectedNodeId: null }),
  setActiveSubTab: (tab) => set({ activeSubTab: tab }),
  setUnitSystem: (sys) => set({ unitSystem: sys }),
  toggleConsole: () => set(s => ({ consoleCollapsed: !s.consoleCollapsed })),
  log: (step, msg) => set(s => {
    const sequence = s.logCounter || 0;
    return {
      logCounter: sequence + 1,
      debugLog: [...s.debugLog, { step, msg, sequence, timestamp: `ui-${String(sequence).padStart(3, '0')}` }],
    };
  }),
  clearLog: () => set({ debugLog: [], logCounter: 0 }),

  moveNode: (id, newPos) => {
    set(s => ({ nodes: { ...s.nodes, [id]: { ...s.nodes[id], pos: newPos } } }));
    get().recalcSegmentLengths();
    get().runAnalysis();
  },

  adjustSegmentDelta: (segId, dx, dy, dz) => {
    const { nodes, segments } = get();
    const seg = segments.find(s => s.id === segId);
    if (!seg) return;

    const startNode = nodes[seg.startNode];
    const endNodeId = seg.endNode;

    if (startNode) {
       const newPos = [
          startNode.pos[0] + dx,
          startNode.pos[1] + dy,
          startNode.pos[2] + dz
       ];
       get().moveNode(endNodeId, newPos);
    }
  },

  recalcSegmentLengths: () => {
    const { nodes, segments } = get();
    const updated = segments.map(seg => {
      const n1 = nodes[seg.startNode]?.pos;
      const n2 = nodes[seg.endNode]?.pos;
      if (!n1 || !n2) return seg;
      const dx = n2[0]-n1[0], dy = n2[1]-n1[1], dz = n2[2]-n1[2];
      const length_mm = Math.sqrt(dx*dx + dy*dy + dz*dz);
      return { ...seg, length_in: length_mm / 25.4 };
    });
    set({ segments: updated });
  },

  updateSegmentProperty: (segIds, updates) => {
    const { segments, fittingData } = get();
    const ids = Array.isArray(segIds) ? segIds : [segIds];

    let newSegments = [...segments];
    let newFittingData = { ...fittingData };
    let firstUpdatedSegIdx = -1;

    ids.forEach(segId => {
      const segIdx = newSegments.findIndex(s => s.id === segId);
      if (segIdx === -1) return;

      if (firstUpdatedSegIdx === -1) firstUpdatedSegIdx = segIdx;

      const seg = newSegments[segIdx];
      newSegments[segIdx] = { ...seg, ...updates };

      if (updates.od_in !== undefined || updates.wt_in !== undefined) {
        newFittingData[segId] = getSIFData(
          seg.compType,
          newSegments[segIdx].od_in,
          newSegments[segIdx].wt_in,
          true,
          'LR'
        );
      }
    });

    if (firstUpdatedSegIdx === -1) return;

    set({ segments: newSegments, fittingData: newFittingData });

    if (updates.material) {
        const tempC = (get().params.designTemp_F - 32) * 5 / 9;
        const props = getMaterialProperties(
            updates.material,
            tempC,
            newSegments[firstUpdatedSegIdx].od_in * 25.4,
            newSegments[firstUpdatedSegIdx].wt_in * 25.4
        );
        if (props && props.E) {
            const E_psi = parseFloat(props.E) / 0.00689476;
            const alpha_F = parseFloat(props.alpha) / 1.8;
            const Sa_psi = parseFloat(props.Sa) / 0.00689476;
            set(s => ({
                params: {
                    ...s.params,
                    E_psi,
                    alpha_in_in_F: alpha_F,
                    Sa_psi
                }
            }));
        }
    }

    get().runAnalysis();
  },

  splitSegmentAtPoint: (segId, point) => {
    const { nodes, segments, fittingData } = get();
    const segIdx = segments.findIndex(s => s.id === segId);
    if (segIdx === -1) return;

    const origSeg = segments[segIdx];
    const startNode = nodes[origSeg.startNode];
    const endNode = nodes[origSeg.endNode];

    if (!startNode || !endNode) return;

    const safeSegId = String(segId).replace(/[^A-Za-z0-9_-]/g, '_');
    const existingIds = new Set(Object.keys(nodes));
    let splitCounter = get().splitCounter || 0;
    let newNodeId = `N_SPLIT_${safeSegId}_${splitCounter}`;
    while (existingIds.has(newNodeId)) {
      splitCounter += 1;
      newNodeId = `N_SPLIT_${safeSegId}_${splitCounter}`;
    }
    const newNodes = {
        ...nodes,
        [newNodeId]: {
            pos: [point.x, point.y, point.z],
            type: 'anchor',
            label: 'Support'
        }
    };

    const dx1 = point.x - startNode.pos[0];
    const dy1 = point.y - startNode.pos[1];
    const dz1 = point.z - startNode.pos[2];
    const len1_in = Math.sqrt(dx1*dx1 + dy1*dy1 + dz1*dz1) / 25.4;

    const dx2 = endNode.pos[0] - point.x;
    const dy2 = endNode.pos[1] - point.y;
    const dz2 = endNode.pos[2] - point.z;
    const len2_in = Math.sqrt(dx2*dx2 + dy2*dy2 + dz2*dz2) / 25.4;

    const seg1 = {
        ...origSeg,
        id: `${origSeg.id}-A`,
        endNode: newNodeId,
        length_in: len1_in
    };

    const seg2 = {
        ...origSeg,
        id: `${origSeg.id}-B`,
        startNode: newNodeId,
        length_in: len2_in
    };

    const newSegments = [...segments];
    newSegments.splice(segIdx, 1, seg1, seg2);

    const newFittingData = { ...fittingData };
    if (newFittingData[origSeg.id]) {
        newFittingData[seg1.id] = { ...newFittingData[origSeg.id] };
        newFittingData[seg2.id] = { ...newFittingData[origSeg.id] };
        delete newFittingData[origSeg.id];
    } else {
        newFittingData[seg1.id] = getSIFData(seg1.compType, seg1.od_in, seg1.wt_in, true, 'LR');
        newFittingData[seg2.id] = getSIFData(seg2.compType, seg2.od_in, seg2.wt_in, true, 'LR');
    }

    set({ nodes: newNodes, segments: newSegments, fittingData: newFittingData, activeTool: 'select', splitCounter: splitCounter + 1 });
    get().runAnalysis();
  },

  runAnalysis: () => {
    get().clearLog();
    const { nodes, segments, params, includeSIF, fittingData } = get();

    const payload = JSON.parse(JSON.stringify({
        nodes,
        segments,
        params,
        fittingData,
        includeSIF,
        activeSolver: 'GC3D'
    }));

    const result = solveGC3D(payload);

    const res = result.results || result;
    set({
        activeSolver: 'GC3D',
        legResults: res.legResults || [],
        nodeResults: res.nodeResults || [],
        criticalNode: res.criticalNode || null,
        overallResult: res.overallResult || 'FAIL',
        debugLog: [...get().debugLog, ...(res.debugLog || [])]
    });
  },

  importFromViewer: (selectedComps, globalParams) => {
     const nodes = {}; const segments = []; const fittingData = {};

     const getHash = (x, y, z) => `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
     const nodeMap = new Map();
     let nodeCounter = 0;

     const addOrGetNode = (x, y, z) => {
         const hash = getHash(x, y, z);
         if (nodeMap.has(hash)) {
             return nodeMap.get(hash);
         }
         const nodeId = `N${nodeCounter++}`;
         nodeMap.set(hash, nodeId);
         nodes[nodeId] = { pos: [x, y, z], type: 'free', label: nodeId, connections: 0, compTypes: [] };
         return nodeId;
     };

     const pipingComps = selectedComps.filter(c => ['PIPE', 'ELBOW', 'BEND', 'TEE'].includes(c.type));

     pipingComps.forEach((c) => {
        if (!c.points || c.points.length < 2) return;

        let n1Id, n2Id;

        const od_in = (c.bore || 273.05) / 25.4;
        const wt_in = 0.322;
        const materialName = c.attributes?.MATERIAL || get().config.defaultMaterial;

        if (c.type === 'ELBOW' || c.type === 'BEND') {
             if (c.centrePoint) {
                 n1Id = addOrGetNode(c.points[0].x, c.points[0].y, c.points[0].z);
                 const centerNodeId = addOrGetNode(c.centrePoint.x, c.centrePoint.y, c.centrePoint.z);
                 n2Id = addOrGetNode(c.points[1].x, c.points[1].y, c.points[1].z);

                 nodes[n1Id].connections++; nodes[n1Id].compTypes.push(c.type);
                 nodes[centerNodeId].connections += 2; nodes[centerNodeId].compTypes.push(c.type, c.type);
                 nodes[n2Id].connections++; nodes[n2Id].compTypes.push(c.type);

                 const getAxis = (p1, p2) => {
                     const dx = p2.x - p1.x; const dy = p2.y - p1.y; const dz = p2.z - p1.z;
                     if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > Math.abs(dz)) return 'Y';
                     if (Math.abs(dz) > Math.abs(dx) && Math.abs(dz) > Math.abs(dy)) return 'Z';
                     return 'X';
                 };

                 const s1_len = Math.sqrt(Math.pow(c.centrePoint.x - c.points[0].x, 2) + Math.pow(c.centrePoint.y - c.points[0].y, 2) + Math.pow(c.centrePoint.z - c.points[0].z, 2)) / 25.4;
                 const s2_len = Math.sqrt(Math.pow(c.points[1].x - c.centrePoint.x, 2) + Math.pow(c.points[1].y - c.centrePoint.y, 2) + Math.pow(c.points[1].z - c.centrePoint.z, 2)) / 25.4;

                 segments.push({
                     id: `${c.id}-1`, startNode: n1Id, endNode: centerNodeId, compType: c.type,
                     axis: getAxis(c.points[0], c.centrePoint), length_in: s1_len, od_in, wt_in, material: materialName
                 });
                 segments.push({
                     id: `${c.id}-2`, startNode: centerNodeId, endNode: n2Id, compType: c.type,
                     axis: getAxis(c.centrePoint, c.points[1]), length_in: s2_len, od_in, wt_in, material: materialName
                 });

                 fittingData[c.id] = getSIFData(c.type, od_in, wt_in, true, 'LR');
                 return;
             } else {
                 n1Id = addOrGetNode(c.points[0].x, c.points[0].y, c.points[0].z);
                 n2Id = addOrGetNode(c.points[1].x, c.points[1].y, c.points[1].z);
             }
        } else {
            n1Id = addOrGetNode(c.points[0].x, c.points[0].y, c.points[0].z);
            n2Id = addOrGetNode(c.points[1].x, c.points[1].y, c.points[1].z);
        }

        nodes[n1Id].connections++; nodes[n1Id].compTypes.push(c.type);
        nodes[n2Id].connections++; nodes[n2Id].compTypes.push(c.type);

        const dx = c.points[1].x - c.points[0].x;
        const dy = c.points[1].y - c.points[0].y;
        const dz = c.points[1].z - c.points[0].z;
        let axis = 'X';
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > Math.abs(dz)) axis = 'Y';
        if (Math.abs(dz) > Math.abs(dx) && Math.abs(dz) > Math.abs(dy)) axis = 'Z';

        const len_in = Math.sqrt(dx*dx + dy*dy + dz*dz) / 25.4;

        segments.push({
           id: c.id, startNode: n1Id, endNode: n2Id, compType: c.type,
           axis, length_in: len_in, od_in, wt_in, material: materialName
        });

        fittingData[c.id] = getSIFData(c.type, od_in, wt_in, true, 'LR');
     });

     if (segments.length > 0) {
        const tempC = (get().params.designTemp_F - 32) * 5 / 9;
        const firstSeg = segments[0];
        const props = getMaterialProperties(firstSeg.material, tempC, firstSeg.od_in * 25.4, firstSeg.wt_in * 25.4);
        if (props && props.E) {
            const E_psi = parseFloat(props.E) / 0.00689476;
            const alpha_F = parseFloat(props.alpha) / 1.8;
            const Sa_psi = parseFloat(props.Sa) / 0.00689476;
            set(s => ({
                params: {
                    ...s.params,
                    E_psi,
                    alpha_in_in_F: alpha_F,
                    Sa_psi
                }
            }));
        }
     }

     Object.keys(nodes).forEach(nodeId => {
         const node = nodes[nodeId];
         if (node.connections === 1) {
             node.type = 'anchor';
         } else if (node.connections === 2 && (node.compTypes.includes('ELBOW') || node.compTypes.includes('BEND'))) {
             node.type = 'elbow';
         } else if (node.connections >= 3 && node.compTypes.includes('TEE')) {
             node.type = 'tee';
         } else {
             node.type = 'free';
         }
         delete node.connections;
         delete node.compTypes;
     });

     set({ nodes, segments, fittingData });
     get().runAnalysis();
  },

  splitSegment: (segId, ratio) => {
    const state = get();
    const segIdx = state.segments.findIndex(s => s.id === segId);
    if (segIdx === -1) return;

    const seg = state.segments[segIdx];
    const n1 = state.nodes[seg.startNode];
    const n2 = state.nodes[seg.endNode];

    const newPos = [
        n1.pos[0] + (n2.pos[0] - n1.pos[0]) * ratio,
        n1.pos[1] + (n2.pos[1] - n1.pos[1]) * ratio,
        n1.pos[2] + (n2.pos[2] - n1.pos[2]) * ratio,
    ];

    const sequence = state.splitCounter || 0;
    const newNodeId = `N_split_${String(sequence).padStart(3, '0')}`;
    const newSeg1Id = `S_split_${String(sequence).padStart(3, '0')}_1`;
    const newSeg2Id = `S_split_${String(sequence).padStart(3, '0')}_2`;

    const newNodes = { ...state.nodes, [newNodeId]: { pos: newPos, type: 'free' } };

    const newSegments = [...state.segments];
    newSegments.splice(segIdx, 1);

    newSegments.push({ ...seg, id: newSeg1Id, endNode: newNodeId, length_in: seg.length_in * ratio });
    newSegments.push({ ...seg, id: newSeg2Id, startNode: newNodeId, length_in: seg.length_in * (1 - ratio) });

    set({ nodes: newNodes, segments: newSegments, splitCounter: sequence + 1 });
    get().runAnalysis();
  },

  deleteNode: (nodeId) => {
    const state = get();
    const newNodes = { ...state.nodes };
    delete newNodes[nodeId];

    const newSegments = state.segments.filter(s => s.startNode !== nodeId && s.endNode !== nodeId);

    set({ nodes: newNodes, segments: newSegments });
    get().runAnalysis();
  },

  importFromSketcher: (sketchNodes, sketchSegments, sketchSettings = {}) => {
      const nodes = {};
      const segments = [];
      const fittingData = {};

      Object.entries(sketchNodes).forEach(([id, node]) => {
          nodes[id] = {
              pos: node.pos,
              type: node.type || 'free',
              label: id,
          };
      });

      sketchSegments.forEach((seg, idx) => {
          const n1 = sketchNodes[seg.startNode];
          const n2 = sketchNodes[seg.endNode];
          if (!n1 || !n2) return;

          const dx = n2.pos[0] - n1.pos[0];
          const dy = n2.pos[1] - n1.pos[1];
          const dz = n2.pos[2] - n1.pos[2];
          const length_mm = Math.sqrt(dx*dx + dy*dy + dz*dz);
          const length_in = length_mm / 25.4;

          let axis = 'X';
          if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > Math.abs(dz)) axis = 'Y';
          if (Math.abs(dz) > Math.abs(dx) && Math.abs(dz) > Math.abs(dy)) axis = 'Z';

          const bore_mm = seg.properties?.bore || 100;
          const od_in   = bore_mm / 25.4;
          const wt_in   = (seg.properties?.wt) ? (seg.properties.wt / 25.4) : (od_in * 0.065);
          const material = seg.properties?.material || get().config.defaultMaterial;
          let compType = seg.properties?.type || 'PIPE';

          const node1Type = sketchNodes[seg.startNode]?.type;
          const node2Type = sketchNodes[seg.endNode]?.type;
          
          if (compType === 'PIPE' || compType === 'FITTING_LEG') {
              if (node1Type === 'elbow' || node2Type === 'elbow') compType = 'ELBOW';
              else if (node1Type === 'tee' || node2Type === 'tee') compType = 'TEE';
              else if (node1Type === 'branch' || node2Type === 'branch') compType = 'BRANCH';
              else if (node1Type === 'olet' || node2Type === 'olet') compType = 'OLET';
          }

          const gcSeg = {
              id: seg.id || `S${idx}`,
              startNode: seg.startNode,
              endNode: seg.endNode,
              compType,
              axis,
              length_in,
              od_in,
              wt_in,
              material,
          };

          segments.push(gcSeg);
          fittingData[gcSeg.id] = getSIFData(compType, od_in, wt_in, true, 'LR');
      });

      const currentParams = { ...get().params };
      if (sketchSettings.designTemperature) {
          currentParams.deltaT_F = sketchSettings.designTemperature - 70;
      }

      const preflight = buildSketcherGC3DPreflight(nodes, segments);
      if (!preflight.ok) {
          set({
              nodes,
              segments,
              fittingData,
              params: currentParams,
              activeSolver: 'GC3D',
              legResults: [],
              nodeResults: [],
              criticalNode: null,
              overallResult: preflight.status,
              debugLog: preflight.diagnostics,
              logCounter: preflight.diagnostics.length,
          });
          return preflight;
      }

      const connCount = {};
      segments.forEach(s => {
          connCount[s.startNode] = (connCount[s.startNode] || 0) + 1;
          connCount[s.endNode]   = (connCount[s.endNode]   || 0) + 1;
      });
      Object.entries(nodes).forEach(([id, node]) => {
          if (node.type === 'free' && connCount[id] === 1) {
              nodes[id] = { ...node, type: 'anchor' };
          }
      });

      set({ nodes, segments, fittingData, params: currentParams });
      get().runAnalysis();
      return { ok: true, status: 'READY_FOR_GC3D', diagnostics: [] };
  },

}));

export { buildSketcherGC3DPreflight };

// PLACEHOLDERS
export function joinSegments(segId1, segId2) { console.warn('[GC3D] PLACEHOLDER: joinSegments() called but not implemented'); return null; }
export function addNode(pos, type) { console.warn('[GC3D] PLACEHOLDER: addNode() called but not implemented'); return null; }
export function editProperty(segId, propName, newValue) { console.warn('[GC3D] PLACEHOLDER: editProperty() called but not implemented'); return null; }
export function exportToCAESAR(format) { console.warn('[GC3D] PLACEHOLDER: exportToCAESAR() called but not implemented'); return null; }
export function importFromCSV(csvText) { console.warn('[GC3D] PLACEHOLDER: importFromCSV() called but not implemented'); return null; }
export function undoAction() { console.warn('[GC3D] PLACEHOLDER: undoAction() called but not implemented'); return null; }
export function redoAction() { console.warn('[GC3D] PLACEHOLDER: redoAction() called but not implemented'); return null; }
