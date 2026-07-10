/**
 * Functionality: top-level Calculation Workspace UI for importing enriched
 * RVM packages, rendering raw geometry, inspecting dynamic properties, and
 * viewing real support-load calculations. Parameters: browser file/storage
 * inputs and workspace store state. Outputs: independent workspace canvas,
 * hierarchy panel, property panel, geometry table, and calculation HUD.
 * Fallback: manual JSON import remains available when postMessage handoff is
 * unavailable.
 */

import React, { useRef, useState } from 'react';
import { Download, Inbox, RefreshCw, Trash2, Upload } from 'lucide-react';
import WorkspaceCanvas from './WorkspaceCanvas.jsx';
import WorkspaceGeometryTable from './WorkspaceGeometryTable.jsx';
import WorkspaceHierarchyPanel from './WorkspaceHierarchyPanel.jsx';
import WorkspaceLoadCalculationPanel from './WorkspaceLoadCalculationPanel.jsx';
import WorkspaceLoadHud from './WorkspaceLoadHud.jsx';
import WorkspacePropertyPanel from './WorkspacePropertyPanel.jsx';
import { useCalculationWorkspaceStore } from './useCalculationWorkspaceStore.js';
import { PENDING_WORKSPACE_PACKAGE_STORAGE_KEY } from './workspaceModel.js';
import { buildSupportLoadStageTree } from './supportLoadDistribution.js';
import './CalculationWorkspace.css';

const WORKSPACE_VIEWS = Object.freeze([
  { id: 'geometry', label: 'Geometry Review' },
  { id: 'loads', label: 'Load Calculation' },
]);

export default function CalculationWorkspaceTab() {
  const fileInputRef = useRef(null);
  const workspace = useCalculationWorkspaceStore((state) => state.workspace);
  const summary = workspace?.summary || {};
  const status = useCalculationWorkspaceStore((state) => state.status);
  const lastError = useCalculationWorkspaceStore((state) => state.lastError);
  const lastImportSource = useCalculationWorkspaceStore((state) => state.lastImportSource);
  const supportLoad = useCalculationWorkspaceStore((state) => state.supportLoad);
  const supportLoadDistribution = useCalculationWorkspaceStore((state) => state.supportLoadDistribution);
  const importWorkspacePackage = useCalculationWorkspaceStore((state) => state.importWorkspacePackage);
  const clearWorkspace = useCalculationWorkspaceStore((state) => state.clearWorkspace);
  const rebuildSupportLoads = useCalculationWorkspaceStore((state) => state.rebuildSupportLoads);
  const [message, setMessage] = useState('Import an enriched RVM workspace package exported from 3D Viewer.');
  const [activeWorkspaceView, setActiveWorkspaceView] = useState('geometry');
  const [bottomCollapsed, setBottomCollapsed] = useState(true);

  async function handleFileChange(event) {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    try {
      const rawText = await file.text();
      importWorkspacePackage(JSON.parse(rawText), `file:${file.name}`);
      setMessage(`Imported ${file.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      event.target.value = '';
    }
  }

  function importPendingPackage() {
    try {
      const rawText = window.sessionStorage?.getItem(PENDING_WORKSPACE_PACKAGE_STORAGE_KEY)
        || window.localStorage?.getItem(PENDING_WORKSPACE_PACKAGE_STORAGE_KEY)
        || '';
      if (!rawText) throw new Error(`No pending package found at ${PENDING_WORKSPACE_PACKAGE_STORAGE_KEY}.`);
      importWorkspacePackage(JSON.parse(rawText), 'browser-storage:pending');
      setMessage('Imported pending RVM workspace package.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  function exportSupportLoadJson() {
    if (!supportLoad) return;
    const sourceFile = workspace?.packageMeta?.source?.sourceFileName || 'workspace';
    downloadJson(`${safeFileName(sourceFile)}_support_load_results.json`, {
      ...supportLoad,
      supportLoadDistribution: supportLoadDistribution || null,
    });
  }

  function exportSupportLoadStageJson() {
    if (!workspace || !supportLoadDistribution) return;
    const sourceFile = workspace?.packageMeta?.source?.sourceFileName || 'workspace';
    const stageTree = buildSupportLoadStageTree(workspace, supportLoadDistribution, sourceFile);
    downloadJson(`${safeFileName(sourceFile)}_support_loads_stage.json`, stageTree);
  }

  function exportWorkspaceJson() {
    if (!workspace) return;
    const sourceFile = workspace?.packageMeta?.source?.sourceFileName || 'workspace';
    downloadJson(`${safeFileName(sourceFile)}_calculation_workspace.json`, workspace);
  }

  const statusMessage = lastError || message;
  const isLoadView = activeWorkspaceView === 'loads';

  return (
    <div className="cw-root">
      <header className="cw-header">
        <div className="cw-header-brand">
          <h1 title="Inspect enriched geometry and run support-load calculations from real imported fields.">RVM Workspace</h1>
          <nav className="cw-mode-tabs" aria-label="Workspace views">
            {WORKSPACE_VIEWS.map((view) => (
              <button
                type="button"
                key={view.id}
                className={activeWorkspaceView === view.id ? 'is-active' : ''}
                onClick={() => setActiveWorkspaceView(view.id)}
              >
                {view.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="cw-actions">
          <button type="button" onClick={() => fileInputRef.current?.click()}><Upload size={14} /> Import</button>
          <button type="button" onClick={importPendingPackage}><Inbox size={14} /> Pending</button>
          <button type="button" onClick={rebuildSupportLoads} disabled={!workspace}><RefreshCw size={14} /> Calc</button>
          <button type="button" onClick={exportSupportLoadJson} disabled={!supportLoad}><Download size={14} /> Load JSON</button>
          <button type="button" onClick={exportSupportLoadStageJson} disabled={!supportLoadDistribution} title="Export staggedJson with per-support load markers, viewable in the 3D JSON viewer"><Download size={14} /> Stage JSON</button>
          <button type="button" onClick={exportWorkspaceJson} disabled={!workspace}><Download size={14} /> Workspace JSON</button>
          <button type="button" onClick={clearWorkspace}><Trash2 size={14} /> Clear</button>
          <input ref={fileInputRef} type="file" accept=".json" hidden onChange={handleFileChange} />
        </div>
      </header>
      <section className="cw-sub-header">
        <div className="cw-statusbar-compact">
          <span className={`cw-status status-${status}`}>{status}</span>
          <span className="cw-status-msg" title={statusMessage}>{statusMessage} {lastImportSource && `(${lastImportSource})`}</span>
        </div>
        {workspace && (
          <div className="cw-summary-compact">
            {metric('Obj', summary.objects)}
            {metric('Pipes', summary.pipes)}
            {metric('Supp', summary.supports)}
            {metric('Br', summary.branches)}
            {metric('Res', summary.resolved)}
            {metric('Miss', summary.missing)}
            {metric('Calc', supportLoad?.summary?.calculated)}
            {metric('Blk', supportLoad?.summary?.blocked)}
          </div>
        )}
      </section>
      <main className={`cw-main ${isLoadView ? 'cw-main-load' : ''}`}>
        <WorkspaceHierarchyPanel />
        <section className={`cw-center ${isLoadView ? 'cw-center-load' : ''} ${bottomCollapsed ? 'cw-bottom-collapsed' : ''}`}>
          <WorkspaceCanvas />
          <div className="cw-bottom-panel-container">
            <div className="cw-bottom-panel-header" onClick={() => setBottomCollapsed(!bottomCollapsed)}>
              <span className="cw-bottom-panel-title">{isLoadView ? 'Load Calculation Results' : 'Geometry Elements'}</span>
              <button type="button" className="cw-bottom-panel-toggle">
                {bottomCollapsed ? 'Expand ▲' : 'Collapse ▼'}
              </button>
            </div>
            {!bottomCollapsed && (
              <div className="cw-bottom-panel-content">
                {isLoadView ? <WorkspaceLoadCalculationPanel /> : <WorkspaceGeometryTable />}
              </div>
            )}
          </div>
          <WorkspaceLoadHud />
        </section>
        <WorkspacePropertyPanel />
      </main>
    </div>
  );
}

function metric(label, value) {
  return (
    <div className="cw-summary-card" key={label}>
      <span>{label}</span>
      <strong>{Number(value || 0)}</strong>
    </div>
  );
}

function downloadJson(fileName, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFileName(value) {
  const cleaned = String(value || 'workspace').replace(/\.[A-Za-z0-9]+$/, '').replace(/[^A-Za-z0-9_.-]+/g, '_');
  return cleaned || 'workspace';
}
