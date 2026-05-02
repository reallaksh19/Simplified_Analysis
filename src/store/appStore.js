import { create } from 'zustand';
import { pcfToCanonicalGeometry } from '../core/geometry/adapters/pcfToCanonicalGeometry';

const emptyCanonicalGeometry = Object.freeze({
  schemaVersion: 'canonical-geometry-v1',
  nodes: [],
  segments: [],
  source: 'pcf',
  unit: 'mm',
  diagnostics: [],
  summary: { componentCount: 0, nodeCount: 0, segmentCount: 0 },
  valid: true,
});


const emptySimplified2D = Object.freeze({
  schemaVersion: 'simplified-2d-v1',
  source: 'none',
  plane: 'XY',
  nodes: {},
  segments: [],
  diagnostics: [],
  warnings: [],
  summary: { nodeCount: 0, segmentCount: 0, geometryType: 'EMPTY' },
});

const emptyTransform2D = Object.freeze({
  schemaVersion: 'transform-2d-v1',
  source: 'none',
  plane: 'XY',
  segments2D: [],
  diagnostics: [],
  summary: { segmentCount: 0 },
});

const buildCanonicalSafe = (components, source = 'pcf') => {
  try {
    return pcfToCanonicalGeometry(Array.isArray(components) ? components : [], { source, unit: 'mm' });
  } catch (error) {
    return {
      ...emptyCanonicalGeometry,
      source,
      valid: false,
      diagnostics: [{
        severity: 'error',
        code: 'CANONICAL_BUILD_FAILED',
        message: error instanceof Error ? error.message : String(error),
        data: {},
      }],
      summary: { componentCount: Array.isArray(components) ? components.length : 0, nodeCount: 0, segmentCount: 0, errorCount: 1 },
    };
  }
};

export const useAppStore = create((set, get) => ({
  activeTab: 'home', // authoritative default tab id from uiTabs
  setActiveTab: (tab) => set({ activeTab: tab }),


  engineeringDefaults: {
    projectUnitSystem: 'imperial',
    defaultLengthUnit: 'ft',
    defaultForceUnit: 'lbf',
    defaultStressUnit: 'psi',
    pipeDataSource: 'internal-screening-db',
    materialDataSource: 'internal-screening-db',
    rackFrictionFactor: 0.3,
    rackSpacingMargin: 75,
    shortDropLimit_ft: 3.0,
    allowPlaceholderLoads: false,
    reportTimestampPolicy: 'exclude-from-deterministic-hash',
    benchmarkCertificationRequired: true
  },
  resultsStale: false,
  currentBenchmarkMock: null,
  setEngineeringDefault: (key, value) => set((state) => ({
    engineeringDefaults: { ...state.engineeringDefaults, [key]: value },
    resultsStale: true
  })),
  setEngineeringDefaults: (patch) => set((state) => ({
    engineeringDefaults: { ...state.engineeringDefaults, ...(patch || {}) },
    resultsStale: true
  })),
  markResultsStale: () => set({ resultsStale: true }),
  clearResultsStale: () => set({ resultsStale: false }),
  loadBenchmarkMock: (mock) => set({
    currentBenchmarkMock: mock || null,
    activeTab: mock?.loadTargetTab || get().activeTab,
    analysisPayload: mock?.benchmarkInput || get().analysisPayload,
    resultsStale: true
  }),

  components: [],
  canonicalGeometry: emptyCanonicalGeometry,
  activeCanonicalGeometry: emptyCanonicalGeometry,
  transform2dPayload: emptyTransform2D,
  simplifiedGeometry: emptySimplified2D,
  sketcherGeometry: emptyCanonicalGeometry,
  geometryDiagnostics: [],
  setCanonicalGeometry: (canonicalGeometry) => set({
    canonicalGeometry: canonicalGeometry || emptyCanonicalGeometry,
    activeCanonicalGeometry: canonicalGeometry || emptyCanonicalGeometry,
    geometryDiagnostics: canonicalGeometry?.diagnostics || [],
  }),
  setActiveCanonicalGeometry: (canonicalGeometry) => set({
    activeCanonicalGeometry: canonicalGeometry || emptyCanonicalGeometry,
    geometryDiagnostics: canonicalGeometry?.diagnostics || [],
  }),
  setTransform2DPayload: (payload) => set({ transform2dPayload: payload || emptyTransform2D }),
  setSimplifiedGeometry: (payload) => set({ simplifiedGeometry: payload || emptySimplified2D }),
  setSketcherGeometry: (canonicalGeometry) => set({
    sketcherGeometry: canonicalGeometry || emptyCanonicalGeometry,
    activeCanonicalGeometry: canonicalGeometry || emptyCanonicalGeometry,
    geometryDiagnostics: canonicalGeometry?.diagnostics || [],
  }),
  setComponents: (comps) => {
    const components = Array.isArray(comps) ? comps : [];
    const canonicalGeometry = buildCanonicalSafe(components, 'pcf');
    set({
      components,
      canonicalGeometry,
      activeCanonicalGeometry: canonicalGeometry,
      geometryDiagnostics: canonicalGeometry.diagnostics || [],
    });
  },
  getSelectedComponents: () => {
    const state = get();
    return state.components.filter((component) => state.selectedIds.has(component.id));
  },
  getSelectedCanonicalGeometry: () => {
    const selected = get().getSelectedComponents();
    return buildCanonicalSafe(selected, 'pcf-selection');
  },

  pcfText: '',
  setPcfText: (pcfText) => set({ pcfText }),

  updateComponentAttribute: (index, field, value) => set((state) => {
    const components = state.components.map((component, componentIndex) => {
      if (componentIndex !== index) return component;
      return {
        ...component,
        attributes: {
          ...(component.attributes || {}),
          [field]: value,
        },
      };
    });
    const canonicalGeometry = buildCanonicalSafe(components, 'pcf');
    return { components, canonicalGeometry, activeCanonicalGeometry: canonicalGeometry, geometryDiagnostics: canonicalGeometry.diagnostics || [] };
  }),
  updateComponentPoint: (index, ptIndex, prop, value) => set((state) => {
    const components = state.components.map((component, componentIndex) => {
      if (componentIndex !== index) return component;
      const points = Array.isArray(component.points) ? component.points.map((point, pointIndex) => (
        pointIndex === ptIndex ? { ...point, [prop]: Number(value) } : point
      )) : [];
      return { ...component, points };
    });
    const canonicalGeometry = buildCanonicalSafe(components, 'pcf');
    return { components, canonicalGeometry, activeCanonicalGeometry: canonicalGeometry, geometryDiagnostics: canonicalGeometry.diagnostics || [] };
  }),

  selectedIds: new Set(),
  toggleSelection: (id) => {
    set((state) => {
      const newSelected = new Set(state.selectedIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return { selectedIds: newSelected };
    });
  },
  clearSelection: () => set({ selectedIds: new Set() }),

  // 3D to 2D Transformation states
  transformMode: 'Auto', // default fallback
  setTransformMode: (mode) => set({ transformMode: mode }),

  // Mapping of geometry tab names (e.g. 'UNIFIED', 'GEO1') to their specific transform modes
  tabTransformModes: { UNIFIED: 'Auto' },
  setTabTransformMode: (tabName, mode) => set((state) => ({
    tabTransformModes: { ...state.tabTransformModes, [tabName]: mode },
  })),

  // Store the active geometry tab in the TransformTab so controls can access it
  activeGeoTab: 'UNIFIED',
  setActiveGeoTab: (tabName) => set({ activeGeoTab: tabName }),

  smart2DConversionEnabled: true,
  setSmart2DConversionEnabled: (enabled) => set({ smart2DConversionEnabled: enabled }),

  processParams: {
    deltaT: 148.9,
    od: 273.05,
    E: 199948,
    alpha: 0.00001116,
    Sa: 137.9,
    I: 66896169,
  },
  setProcessParams: (newParams) => set((state) => ({
    processParams: { ...state.processParams, ...newParams },
  })),

  materialMapping: {}, // Map 3D CA material attributes to 2D Bundle Material names
  updateMaterialMapping: (caMaterial, bundleMaterial) => set((state) => ({
    materialMapping: { ...state.materialMapping, [caMaterial]: bundleMaterial },
  })),

  // Debug/Datatable stages
  processingStages: {
    stage1: [], // Selected 3D Data
    stage2: [], // 3D-to-2D Conversion Intermediate Data
  },
  setProcessingStage: (stageName, data) => set((state) => ({
    processingStages: { ...state.processingStages, [stageName]: data },
  })),

  // Store the actual 2D payload to send to the analysis canvas
  analysisPayload: null,
  setAnalysisPayload: (payload) => set({ analysisPayload: payload }),

  // Store batch of geometries for analysis
  batchAnalysisData: [],
  setBatchAnalysisData: (batch) => set({ batchAnalysisData: batch }),
}));
