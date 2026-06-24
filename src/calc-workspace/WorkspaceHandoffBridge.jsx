/**
 * Functionality: listens globally for 3D_Viewer workspace package handoffs and
 * routes the app to the independent Workspace tab after a valid import.
 * Parameters: browser postMessage payloads. Outputs: imported workspace store
 * state and active tab navigation. Fallback: invalid messages or messages from
 * unrecognised origins are silently ignored; import errors are recorded by the
 * store without mutating the previous successful workspace.
 *
 * Security: only origins matching localhost:3000 (3D_Viewer dev), the same
 * origin as this app, or an empty origin (file://) are trusted.  Adjust
 * TRUSTED_ORIGINS when deploying behind a reverse proxy.
 */

import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useCalculationWorkspaceStore } from './useCalculationWorkspaceStore.js';
import { RVM_SELECTED_GEOMETRY_POST_MESSAGE_TYPE } from './workspaceModel.js';

// Origins permitted to push workspace packages into this app.
// Add production domain(s) here when deploying.
const TRUSTED_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  window.location.origin,
]);

export default function WorkspaceHandoffBridge() {
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const importWorkspacePackage = useCalculationWorkspaceStore((state) => state.importWorkspacePackage);

  useEffect(() => {
    function handleMessage(event) {
      // Reject messages from unknown origins to prevent postMessage injection.
      if (event.origin && !TRUSTED_ORIGINS.has(event.origin)) return;
      const data = event.data || {};
      if (data.type !== RVM_SELECTED_GEOMETRY_POST_MESSAGE_TYPE) return;
      const packageJson = data.packageJson || data.package || data.payload;
      importWorkspacePackage(packageJson, `postMessage:${event.origin || 'unknown'}`);
      setActiveTab('workspace');
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [importWorkspacePackage, setActiveTab]);

  return null;
}
