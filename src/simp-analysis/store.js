import { create } from 'zustand';
import { solveSimplified2D } from '../core/solvers/simplified2d/solveSimplified2D';

const emptyStats = { Lreq: 0, Scalc: 0, ratio: 0, genLeg: 0, absLeg: 0, dx: 0 };

export const useSimpStore = create((set, get) => ({
  nodes: {},
  segments: [],
  plane: 'XY',
  orbitEnabled: true,
  params: { deltaT: 148.9, od: 273.05, E: 199948, alpha: 0.00001116, Sa: 137.9 },
  stats: emptyStats,
  result: { status: 'INVALID', geometryType: 'EMPTY', stats: emptyStats, warnings: [], assumptions: [], formulaTrace: [] },
  classification: { geometryType: 'EMPTY', confidence: 0, warnings: [] },
  warnings: [],
  assumptions: [],
  formulaTrace: [],
  source: 'none',

  setOrbitEnabled: (enabled) => set({ orbitEnabled: enabled }),
  setPlane: (plane) => set({ plane }),
  setParams: (newParams) => {
    set((state) => ({ params: { ...state.params, ...newParams } }));
    get().recalc();
  },
  setSimplifiedPayload: (payload) => {
    set({
      nodes: payload?.nodes || {},
      segments: payload?.segments || [],
      plane: payload?.plane || get().plane || 'XY',
      classification: payload?.classification || { geometryType: 'UNKNOWN', confidence: 0, warnings: [] },
      warnings: payload?.warnings || [],
      source: payload?.source || 'unknown',
    });
    get().recalc();
  },
  setNodes: (nodes) => {
    set({ nodes });
    get().recalc();
  },
  setSegments: (segments) => {
    set({ segments });
    get().recalc();
  },
  moveNode: (id, pos) => {
    set((state) => {
      const newNodes = { ...state.nodes, [id]: { ...state.nodes[id], pos } };
      return { nodes: newNodes };
    });
    get().recalc();
  },
  recalc: () => {
    const { nodes, segments, params, classification, warnings } = get();
    try {
      const result = solveSimplified2D({ nodes, segments, classification, warnings }, params);
      set({
        result,
        stats: result.stats || emptyStats,
        classification: result.classification || classification,
        warnings: result.warnings || [],
        assumptions: result.assumptions || [],
        formulaTrace: result.formulaTrace || [],
      });
    } catch (e) {
      console.error('Simplified Analysis Recalc Error:', e);
      set({
        result: { status: 'INVALID', geometryType: 'ERROR', stats: emptyStats, warnings: [e instanceof Error ? e.message : String(e)], assumptions: [], formulaTrace: [] },
        stats: emptyStats,
        warnings: [e instanceof Error ? e.message : String(e)],
      });
    }
  }
}));
