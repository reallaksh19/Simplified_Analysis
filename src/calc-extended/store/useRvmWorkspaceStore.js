/**
 * Functionality: stores the isolated Simplified Analysis copy of an imported
 * 3D_Viewer selected-geometry workspace package. Parameters: package JSON and
 * import source. Outputs: cloned workspace state, summary, and import status.
 * Fallback: validation errors are raised before existing workspace state changes.
 */

import { create } from 'zustand';
import { normalizeRvmSelectedGeometryWorkspacePackage } from '../workspace/rvmSelectedGeometryWorkspace';

const initialWorkspaceState = {
  status: 'empty',
  workspace: null,
  summary: null,
  lastError: '',
  lastImportSource: '',
};

export const useRvmWorkspaceStore = create((set) => ({
  ...initialWorkspaceState,

  importWorkspacePackage: (packageJson, importSource) => set(() => {
    const importedAt = new Date().toISOString();
    const workspace = normalizeRvmSelectedGeometryWorkspacePackage(packageJson, importSource, importedAt);
    return {
      status: 'ready',
      workspace,
      summary: workspace.summary,
      lastError: '',
      lastImportSource: importSource,
    };
  }),

  setWorkspaceError: (message) => set({
    status: 'error',
    lastError: String(message ?? ''),
  }),

  clearWorkspace: () => set(initialWorkspaceState),
}));
