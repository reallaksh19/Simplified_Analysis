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
  const importWorkspacePackage = useCalculationWorkspaceStore((state) => state.importWorkspacePackage);
  const clearWorkspace = useCalculationWorkspaceStore((state) => state.clearWorkspace);
  const rebuildSupportLoads = useCalculationWorkspaceStore((state) => state.rebuildSupportLoads);
  const [message, setMessage] = useState('Import an enriched RVM workspace package exported from 3D Viewer.');
  const [activeWorkspaceView, setActiveWorkspaceView] = useState('geometry');

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
    downloadJson(`${safeFileName(sourceFile)}_support_load_results.json`, supportLoad);
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
        <div>
          <h1>RVM Workspace</h1>
          <p>Inspect enriched geometry and run support-load calculations from real imported fields.</p>
        </div>
        <div className="cw-actions">
          <button type="button" onClick={() => fileInputRef.current?.click()}><Upload size={15} /> Import</button>
          <button type="button" onClick={importPendingPackage}><Inbox size={15} /> Pending</button>
          <button type="button" onClick={rebuildSupportLoads} disabled={!workspace}><RefreshCw size={15} /> Calc</button>
          <button type="button" onClick={exportSupportLoadJson} disabled={!supportLoad}><Download size={15} /> Load JSON</button>
          <button type="button" onClick={exportWorkspaceJson} disabled={!workspace}><Download size={15} /> Workspace JSON</button>
          <button type="button" onClick={clearWorkspace}><Trash2 size={15} /> Clear</button>
          <input ref={fileInputRef} type="file" accept=".json" hidden onChange={handleFileChange} />
        </div>
      </header>
      <section className="cw-statusbar">
        <span className={`cw-status status-${status}`}>{status}</span>
        <span>{statusMessage}</span>
        {lastImportSource && <em>{lastImportSource}</em>}
      </section>
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
      {workspace && (
        <section className="cw-summary">
          {metric('Objects', summary.objects)}
          {metric('Pipes', summary.pipes)}
          {metric('Supports', summary.supports)}
          {metric('Branches', summary.branches)}
          {metric('Resolved', summary.resolved)}
          {metric('Missing', summary.missing)}
          {metric('Load Calculated', supportLoad?.summary?.calculated)}
          {metric('Load Blocked', supportLoad?.summary?.blocked)}
        </section>
      )}
      <main className={`cw-main ${isLoadView ? 'cw-main-load' : ''}`}>
        <WorkspaceHierarchyPanel />
        <section className={`cw-center ${isLoadView ? 'cw-center-load' : ''}`}>
          <WorkspaceCanvas />
          {isLoadView ? <WorkspaceLoadCalculationPanel /> : <WorkspaceGeometryTable />}
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
