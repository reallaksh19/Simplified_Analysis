/**
 * Functionality: owns UI state for the independent Calculation Workspace and
 * stores cloned imported RVM package data separately from selections, layers,
 * hierarchy filters, and calculated support-load state. Parameters: import
 * packages, selected object ids, layer flags, and HUD movement/collapse data.
 * Outputs: stable workspace state for React views. Fallback: import errors are
 * captured in status without mutating the previous successful workspace.
 */

import { create } from 'zustand';
import { DEFAULT_SUPPORT_LOAD_PROFILE, buildSupportLoadModel, normalizeSupportLoadProfile } from './supportLoadEngine.js';
import {
  buildWorkspaceHierarchy,
  normalizeCalculationWorkspacePackage,
  selectedWorkspaceObject,
} from './workspaceModel.js';

const initialState = {
  status: 'empty',
  workspace: null,
  hierarchy: [],
  selectedObjectId: '',
  isolatedObjectIds: [],
  layerVisibility: {
    pipes: true,
    supports: true,
    centerlines: true,
    labels: false,
  },
  supportLoad: null,
  supportLoadProfile: DEFAULT_SUPPORT_LOAD_PROFILE,
  lastError: '',
  lastImportSource: '',
  hud: {
    x: 24,
    y: 84,
    collapsed: false,
  },
};

export const useCalculationWorkspaceStore = create((set, get) => ({
  ...initialState,

  importWorkspacePackage: (packageJson, importSource) => set((state) => {
    try {
      const importedAt = new Date().toISOString();
      const workspace = normalizeCalculationWorkspacePackage(packageJson, importSource, importedAt);
      const selected = selectedWorkspaceObject(workspace, state.selectedObjectId);
      const supportLoadProfile = normalizeSupportLoadProfile(state.supportLoadProfile);
      const supportLoad = buildSupportLoadModel(workspace, importedAt, supportLoadProfile);
      return {
        status: 'ready',
        workspace,
        hierarchy: buildWorkspaceHierarchy(workspace),
        selectedObjectId: selected?.id || '',
        isolatedObjectIds: [],
        supportLoad,
        supportLoadProfile,
        lastError: '',
        lastImportSource: importSource,
      };
    } catch (error) {
      return {
        status: 'error',
        lastError: error instanceof Error ? error.message : String(error),
      };
    }
  }),

  clearWorkspace: () => set(initialState),

  selectObject: (objectId) => set((state) => {
    const selected = selectedWorkspaceObject(state.workspace, objectId);
    return { selectedObjectId: selected?.id || '' };
  }),

  setLayerVisibility: (layer, visible) => set((state) => ({
    layerVisibility: {
      ...state.layerVisibility,
      [layer]: Boolean(visible),
    },
  })),

  isolateSelected: () => set((state) => ({
    isolatedObjectIds: state.selectedObjectId ? [state.selectedObjectId] : [],
  })),

  showAllObjects: () => set({ isolatedObjectIds: [] }),

  rebuildSupportLoads: () => set((state) => {
    if (!state.workspace) return {};
    const supportLoadProfile = normalizeSupportLoadProfile(state.supportLoadProfile);
    return {
      supportLoadProfile,
      supportLoad: buildSupportLoadModel(state.workspace, new Date().toISOString(), supportLoadProfile),
    };
  }),

  setSupportLoadProfileValue: (field, value) => set((state) => {
    const supportLoadProfile = normalizeSupportLoadProfile({ ...state.supportLoadProfile, [field]: value });
    return {
      supportLoadProfile,
      supportLoad: state.workspace
        ? buildSupportLoadModel(state.workspace, new Date().toISOString(), supportLoadProfile)
        : state.supportLoad,
    };
  }),

  resetSupportLoadProfile: () => set((state) => ({
    supportLoadProfile: DEFAULT_SUPPORT_LOAD_PROFILE,
    supportLoad: state.workspace
      ? buildSupportLoadModel(state.workspace, new Date().toISOString(), DEFAULT_SUPPORT_LOAD_PROFILE)
      : state.supportLoad,
  })),

  setHudPosition: (x, y) => set((state) => ({
    hud: { ...state.hud, x: Number(x) || 0, y: Number(y) || 0 },
  })),

  toggleHudCollapsed: () => set((state) => ({
    hud: { ...state.hud, collapsed: !state.hud.collapsed },
  })),

  getSelectedObject: () => selectedWorkspaceObject(get().workspace, get().selectedObjectId),
}));
