import { create } from 'zustand';
import { useAppStore } from '../../store/appStore';
import { useSketchStore } from '../../sketcher/SketcherStore';
import { canonicalToExtended } from '../../core/geometry/adapters/canonicalToExtended';
import { pcfToCanonicalGeometry } from '../../core/geometry/adapters/pcfToCanonicalGeometry';
import { sketcherToCanonicalGeometry } from '../../core/geometry/adapters/sketcherToCanonicalGeometry';

const initialState = {
  // Global Settings
  methodology: 'FLUOR', // 'FLUOR' | '2D_BUNDLE'
  activeSubTab: '3d', // '2d' | '3d' | 'piperack' | 'config'
  unitSystem: 'Imperial', // 'Imperial' | 'Metric'

  // UI State
  activeView: 'dashboard', // 'dashboard' | '3d-solver'
  calculationStatus: 'AWAITING_ANCHORS', // 'AWAITING_ANCHORS' | 'READY' | 'CALCULATED'
  heatmapMode: 'STRESS', // 'STRESS' | 'SHELL'

  // Geometry (Walled Garden - isolated clone)
  nodes: [],
  segments: [],
  anchors: { anchor1: null, anchor2: null },

  // Piping Inputs
  inputs: {
    material: 'Carbon Steel',
    pipeSize: 8.0,
    schedule: '40',
    tInstall: 70, // Locked environmental param
    tOperate: 300,
    frictionFactor: 0.3, // Mechanical, 2D Bundle only
    corrosionAllowance: 0.125, // Mfg constraint (in)
    millTolerance: 12.5, // Mfg constraint (%)
  },

  // Vessel & Nozzle (MIST)
  vessel: {
    vesselOD: 47.24, // 1200 mm -> ~47.24 inches
    vesselThk: 0.787, // 20 mm -> ~0.787 inches
    nozzleRad: 6.377, // 162 mm -> ~6.377 inches
    designPress: 435, // 3.0 MPa -> ~435 PSI
    flangeClass: 300,
    momentArm: 24, // Assumed distance from centerline (in)
  },

  // Boundary Movement
  boundaryMovement: {
    x: 0,
    y: 0,
    z: 0,
  },

  // System Limits
  constraints: {
    maxStress: 20000,
  },

  // Calculation Results
  results: null,
  importDiagnostics: [],
  importSummary: null,
};

export const useExtendedStore = create((set) => ({
  ...initialState,

  setMethodology: (method) => set({ methodology: method }),
  setActiveSubTab: (tab) => set({ activeSubTab: tab }),
  toggleUnitSystem: (unit) => set({ unitSystem: unit }),
  setActiveView: (view) => set({ activeView: view }),
  setHeatmapMode: (mode) => set({ heatmapMode: mode }),

  updateInput: (key, value) => set((state) => ({
    inputs: { ...state.inputs, [key]: value }
  })),

  updateVessel: (key, value) => set((state) => ({
    vessel: { ...state.vessel, [key]: value }
  })),

  updateBoundaryMovement: (key, value) => set((state) => ({
    boundaryMovement: { ...state.boundaryMovement, [key]: value }
  })),

  updateConstraint: (key, value) => set((state) => ({
    constraints: { ...state.constraints, [key]: value }
  })),

  // One-way hydration from canonical geometry.
  importFromCanonicalGeometry: (canonicalGeometry, source = 'canonical') => set(() => {
    const extendedPayload = canonicalToExtended(canonicalGeometry, { source });
    const nodesClone = JSON.parse(JSON.stringify(extendedPayload.nodes || []));
    const segmentsClone = JSON.parse(JSON.stringify(extendedPayload.segments || []));

    return {
      nodes: nodesClone,
      segments: segmentsClone,
      anchors: { anchor1: null, anchor2: null },
      calculationStatus: nodesClone.length >= 2 && segmentsClone.length > 0 ? 'AWAITING_ANCHORS' : 'AWAITING_GEOMETRY',
      results: null,
      importDiagnostics: extendedPayload.diagnostics || [],
      importSummary: extendedPayload.summary || null,
    };
  }),

  // Backwards-compatible import, retained for older UI calls but no longer used by CalcExtendedTab.
  importFromGlobal: (globalNodes, globalSegments) => set(() => {
    const nodesClone = JSON.parse(JSON.stringify(globalNodes || []));
    const segmentsClone = JSON.parse(JSON.stringify(globalSegments || []));

    return {
      nodes: nodesClone,
      segments: segmentsClone,
      anchors: { anchor1: null, anchor2: null },
      calculationStatus: nodesClone.length >= 2 && segmentsClone.length > 0 ? 'AWAITING_ANCHORS' : 'AWAITING_GEOMETRY',
      results: null,
      importDiagnostics: [],
      importSummary: { source: 'legacy-global', nodeCount: nodesClone.length, segmentCount: segmentsClone.length },
    };
  }),

  importFrom3DViewer: () => {
    const appState = useAppStore.getState();
    const components = appState.components || [];
    const selectedIds = appState.selectedIds || new Set();

    const filtered = components.filter((component) => selectedIds.has(component.id));
    if (filtered.length === 0) {
      alert("No components selected in 3D Viewer. Please select geometry first.");
      return;
    }

    const canonical = pcfToCanonicalGeometry(filtered, { source: 'viewer-selection', unit: 'mm' });
    const extendedPayload = canonicalToExtended(canonical, { source: 'viewer-selection' });

    set({
      nodes: JSON.parse(JSON.stringify(extendedPayload.nodes || [])),
      segments: JSON.parse(JSON.stringify(extendedPayload.segments || [])),
      anchors: { anchor1: null, anchor2: null },
      calculationStatus: extendedPayload.nodes.length >= 2 && extendedPayload.segments.length > 0 ? 'AWAITING_ANCHORS' : 'AWAITING_GEOMETRY',
      results: null,
      importDiagnostics: extendedPayload.diagnostics || [],
      importSummary: extendedPayload.summary || null,
    });
    alert(`Imported ${extendedPayload.nodes.length} nodes and ${extendedPayload.segments.length} segments from canonical Viewer geometry.`);
  },

  importFrom2DSketcher: () => {
    const sketchState = useSketchStore.getState();
    const canonical = sketcherToCanonicalGeometry(sketchState.nodes, sketchState.segments, { source: 'sketcher', unit: 'mm' });
    const extendedPayload = canonicalToExtended(canonical, { source: 'sketcher' });

    if (!extendedPayload.nodes.length) {
      alert("No geometry found in 2D Sketcher.");
      return;
    }

    set({
      nodes: JSON.parse(JSON.stringify(extendedPayload.nodes || [])),
      segments: JSON.parse(JSON.stringify(extendedPayload.segments || [])),
      anchors: { anchor1: null, anchor2: null },
      calculationStatus: extendedPayload.nodes.length >= 2 && extendedPayload.segments.length > 0 ? 'AWAITING_ANCHORS' : 'AWAITING_GEOMETRY',
      results: null,
      importDiagnostics: extendedPayload.diagnostics || [],
      importSummary: extendedPayload.summary || null,
    });
    alert(`Imported ${extendedPayload.nodes.length} nodes and ${extendedPayload.segments.length} segments from canonical Sketcher geometry.`);
  },

  // Anchor Assignment
  setAnchor: (anchorNum, nodeId) => set((state) => {
    const newAnchors = { ...state.anchors, [`anchor${anchorNum}`]: nodeId };
    const status = (newAnchors.anchor1 && newAnchors.anchor2) ? 'READY' : 'AWAITING_ANCHORS';
    return { anchors: newAnchors, calculationStatus: status };
  }),

  // Set Results from Solver
  setResults: (results) => set({
    results,
    calculationStatus: 'CALCULATED'
  }),

  // Inject Golden Master mock data
  loadMockData: (mockObj) => set({
    inputs: mockObj.inputs,
    vessel: mockObj.vessel,
    boundaryMovement: mockObj.boundaryMovement,
    constraints: mockObj.constraints,
    nodes: mockObj.nodes,
    segments: mockObj.segments,
    anchors: mockObj.anchors,
    calculationStatus: 'READY',
    results: null
  }),

  // Reset module
  reset: () => set(initialState)
}));
