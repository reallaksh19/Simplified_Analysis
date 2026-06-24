import { create } from 'zustand';

export const PIPE_RACK_STATE_SCHEMA_VERSION = 'piperack-state-v1';
const PIPE_RACK_STORAGE_KEY = 'simplified_calc_piperack_state_v1';

const sanitizeSnapshot = (snapshot) => {
  if (!snapshot || typeof snapshot !== 'object') return null;
  return {
    globalSettings: snapshot.globalSettings,
    structuralSettings: snapshot.structuralSettings,
    lines: Array.isArray(snapshot.lines) ? snapshot.lines : undefined,
    results: snapshot.results || null,
    sectionLayout: snapshot.sectionLayout || null,
  };
};

const initialState = {
  // Global Rack Settings
  globalSettings: {
    anchorDistanceFt: 200, // Distance between anchors (straight run)
    defaultSpacingFt: 2.5, // Standard spacing step
    allowableStressPsi: 20000, // SA limit
  },

  // Advanced Structural Constraints
  structuralSettings: {
    bowingMultiplier: 0.15,
    beamWidth_mm: 300,
    gussetGap_mm: 100,
    futureSpacePct: 20,
    numTiers: 4,
    tierElevations_mm: {
      1: 4600,
      2: 7600,
      3: 10600,
      4: 13600
    }
  },

  // UI Control
  isSectionCreatorOpen: false,

  // Pipe Lines (Array of line objects)
  lines: [
    {
      id: 'L1',
      sizeNps: 16,
      schedule: '40',
      service: 'Process-Liquid',
      material: 'Carbon Steel',
      tOperate: 150,
      insulationThk: 50, // mm
      guide_mm: 50,
      flange: '300#',
      hasFlange: true,
      stagger: true,
      hasVessel: false,
      vesselData: { R_mm: 800, T_mm: 20, r_n_mm: 100, f_MPa: 138 },
      tier: 1,
      slotIndex: 0,
      loop_order: 0,
      spacing_override: null,
      userOrderIndex: null, // null implies auto-berthing
      color: '#38bdf8',
      is3DLoop: false
    }
  ],

  // Calculation Results
  results: null,
  sectionLayout: null, // Holds X,Y coords for the Advanced Section Creator
  logStream: []
};

export const usePipeRackStore = create((set, get) => ({
  ...initialState,

  toggleSectionCreator: (isOpen) => set({ isSectionCreatorOpen: isOpen }),

  updateGlobalSetting: (key, value) => set((state) => ({
    globalSettings: { ...state.globalSettings, [key]: value }
  })),

  updateStructuralSetting: (key, value) => set((state) => ({
    structuralSettings: { ...state.structuralSettings, [key]: value }
  })),

  updateTierElevation: (tierNum, elev_mm) => set((state) => ({
    structuralSettings: {
      ...state.structuralSettings,
      tierElevations_mm: {
        ...state.structuralSettings.tierElevations_mm,
        [tierNum]: elev_mm
      }
    }
  })),

  addLine: () => set((state) => {
    const newId = `L${state.lines.length + 1}`;

    // Deterministic color assignment keeps engineering snapshots reproducible.
    const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80', '#34d399', '#2dd4bf', '#38bdf8', '#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185'];
    const color = colors[state.lines.length % colors.length];

    const newLine = {
      id: newId,
      sizeNps: 8,
      schedule: '40',
      service: 'Process-Gas',
      material: 'Carbon Steel',
      tOperate: 300,
      insulationThk: 0,
      guide_mm: 50,
      flange: '150#',
      hasFlange: true,
      stagger: true,
      hasVessel: false,
      vesselData: { R_mm: 800, T_mm: 20, r_n_mm: 100, f_MPa: 138 },
      tier: 1,
      slotIndex: 0,
      loop_order: 0,
      spacing_override: null,
      userOrderIndex: null,
      color,
      is3DLoop: false
    };
    return { lines: [...state.lines, newLine] };
  }),

  removeLine: (id) => set((state) => ({
    lines: state.lines.filter(l => l.id !== id)
  })),

  updateLine: (id, key, value) => set((state) => ({
    lines: state.lines.map(l => l.id === id ? { ...l, [key]: value } : l)
  })),

  updateLineOverride: (id, dimKey, value) => set((state) => {
    if (!state.results) return state;
    return {
      results: {
        ...state.results,
        lines: state.results.lines.map(l => {
          if (l.id === id) {
            return {
              ...l,
              dimensions: { ...l.dimensions, [dimKey]: value }
            };
          }
          return l;
        })
      }
    };
  }),

  updateLineVessel: (id, key, value) => set((state) => ({
    lines: state.lines.map(l => {
      if (l.id === id) {
        return { ...l, vesselData: { ...l.vesselData, [key]: value } };
      }
      return l;
    })
  })),

  // Reorders pipes when dragged in Section Creator
  setPipeXOrder: () => set((state) => {
      // Find where newX fits inside the current layout X coords
      // Update userOrderIndex of all lines to lock the auto-berthing override
      // This function will be triggered by drag-drop.
      return { ...state };
  }),

  pushLog: (msg) => set(state => ({
    logStream: [...state.logStream.slice(-99), `[${new Date().toISOString().slice(11,19)}] ${msg}`]
  })),

  addTier: () => set(state => {
    const currentNumTiers = parseInt(state.structuralSettings.numTiers, 10);
    const nextNumTiers = Math.min(currentNumTiers + 1, 5);
    if (nextNumTiers === currentNumTiers) return state;

    // Calculate next tier elevation by adding 3000 to the highest tier's elevation
    const lastElev = state.structuralSettings.tierElevations_mm[currentNumTiers] || (currentNumTiers * 3000 + 1600);
    const newElev = lastElev + 3000;

    return {
      structuralSettings: {
        ...state.structuralSettings,
        numTiers: nextNumTiers,
        tierElevations_mm: {
          ...state.structuralSettings.tierElevations_mm,
          [nextNumTiers]: newElev
        }
      }
    };
  }),

  movePipeTier: (id, direction) => set(state => {
    const numTiers = parseInt(state.structuralSettings.numTiers, 10);
    return {
      lines: state.lines.map(l => {
        if (l.id !== id) return l;
        const currentTier = parseInt(l.tier, 10);
        const newTier = Math.max(1, Math.min(numTiers, currentTier + parseInt(direction, 10)));
        return { ...l, tier: newTier, userOrderIndex: null };
      })
    };
  }),

  setPipeManualPosition: (id, rawX_mm) => set(state => ({
    lines: state.lines.map(l => {
      if (l.id !== id) return l;
      const snappedX = Math.round(parseFloat(rawX_mm) / 50) * 50;
      return { ...l, spacing_override: snappedX };
    })
  })),

  applySmartTierFix: () => set(state => {
    // Determine required number of tiers (at least 3 if Flare exists, at least 2 if Gas/Util exists)
    let maxTierNeeded = 1;
    state.lines.forEach(l => {
      if (l.service.includes('Flare')) maxTierNeeded = Math.max(maxTierNeeded, 3);
      else if (l.service.includes('Gas') || l.service.includes('Utility') || l.service.includes('Utilities')) maxTierNeeded = Math.max(maxTierNeeded, 2);
    });

    // Ensure structural tiers are at least maxTierNeeded
    let nextNumTiers = Math.max(parseInt(state.structuralSettings.numTiers, 10), maxTierNeeded);
    let nextTierElevations = { ...state.structuralSettings.tierElevations_mm };

    // If we increased tiers, populate elevations
    if (nextNumTiers > parseInt(state.structuralSettings.numTiers, 10)) {
       for (let t = parseInt(state.structuralSettings.numTiers, 10) + 1; t <= nextNumTiers; t++) {
           const lastElev = nextTierElevations[t-1] || ((t-1) * 3000 + 1600);
           nextTierElevations[t] = lastElev + 3000;
       }
    }

    const updatedLines = state.lines.map(l => {
      // 1. Assign Tiers
      let smartTier = 1; // Default to Process-Liquid
      if (l.service.includes('Flare')) {
        smartTier = 3;
      } else if (l.service.includes('Gas') || l.service.includes('Utility') || l.service.includes('Utilities')) {
        smartTier = 2;
      }

      // 2. Calculate Weightage Index
      // W_s: NPS / 10
      // W_t: Temp (C) / 240
      // Use operate temperature, if it's imperial (F) we convert it roughly to C for the heuristic,
      // assuming tOperate in the store might be either. Let's assume standard input is F and convert to C.
      // C = (F - 32) * 5/9
      const tempC = (l.tOperate - 32) * (5/9);
      const w_s = (l.sizeNps || 0) / 10;
      const w_t = tempC / 240;
      const w_total = w_s + w_t;

      return {
        ...l,
        tier: Math.min(smartTier, nextNumTiers), // Clamp tier just in case
        loop_order: w_total, // Store weightage here for the solver to use
        spacing_override: null, // Clear manual dragging
        userOrderIndex: null, // Clear manual ordering
        w_s,
        w_t,
        tempC
      };
    });

    const detailedLogs = updatedLines.map(l =>
      `[${new Date().toISOString().slice(11,19)}] [SMART_TIER] ${l.id} (${l.service}) -> Tier ${l.tier} | W_s(${l.w_s.toFixed(2)}) + W_t(${l.w_t.toFixed(2)}) = ${l.loop_order.toFixed(2)}`
    );

    return {
      lines: updatedLines,
      structuralSettings: {
        ...state.structuralSettings,
        numTiers: nextNumTiers,
        tierElevations_mm: nextTierElevations
      },
      logStream: [...state.logStream, `[${new Date().toISOString().slice(11,19)}] [SYSTEM] Applied Smart Tier Fix algorithm.`, ...detailedLogs].slice(-100)
    };
  }),

  setResults: (results) => set({ results }),
  setSectionLayout: (layout) => set({ sectionLayout: layout }),

  exportState: () => {
    const state = get();
    return {
      schemaVersion: PIPE_RACK_STATE_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      globalSettings: state.globalSettings,
      structuralSettings: state.structuralSettings,
      lines: state.lines,
      results: state.results,
      sectionLayout: state.sectionLayout,
    };
  },

  importState: (snapshot) => set((state) => {
    const clean = sanitizeSnapshot(snapshot);
    if (!clean) {
      return { logStream: [...state.logStream.slice(-99), '[IMPORT] Invalid pipe rack snapshot ignored.'] };
    }
    return {
      globalSettings: clean.globalSettings || state.globalSettings,
      structuralSettings: clean.structuralSettings || state.structuralSettings,
      lines: clean.lines || state.lines,
      results: clean.results || null,
      sectionLayout: clean.sectionLayout || null,
      logStream: [...state.logStream.slice(-99), `[IMPORT] Loaded ${PIPE_RACK_STATE_SCHEMA_VERSION} pipe rack snapshot.`],
    };
  }),

  saveStateToLocalStorage: () => {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const snapshot = get().exportState();
    window.localStorage.setItem(PIPE_RACK_STORAGE_KEY, JSON.stringify(snapshot));
    set((state) => ({ logStream: [...state.logStream.slice(-99), `[SAVE] Stored ${PIPE_RACK_STATE_SCHEMA_VERSION} pipe rack snapshot.`] }));
    return true;
  },

  loadStateFromLocalStorage: () => {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const raw = window.localStorage.getItem(PIPE_RACK_STORAGE_KEY);
    if (!raw) return false;
    try {
      get().importState(JSON.parse(raw));
      return true;
    } catch {
      set((state) => ({ logStream: [...state.logStream.slice(-99), '[LOAD] Failed to parse pipe rack localStorage snapshot.'] }));
      return false;
    }
  },

  reset: () => set(initialState)
}));
