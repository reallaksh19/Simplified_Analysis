/**
 * Functionality: React workspace shell for receiving 3D_Viewer selected-geometry
 * packages from file input, pending browser storage, or postMessage handoff.
 * Parameters: current Zustand workspace store actions/state. Outputs: imported
 * package summary, object table, diagnostics, and isolated cloned workspace data.
 * Fallback: import errors are shown in the workspace status line.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Inbox, Trash2, Upload } from 'lucide-react';
import { useRvmWorkspaceStore } from '../store/useRvmWorkspaceStore';
import {
  PENDING_WORKSPACE_PACKAGE_STORAGE_KEY,
  RVM_SELECTED_GEOMETRY_POST_MESSAGE_TYPE,
  RVM_SELECTED_GEOMETRY_WORKSPACE_PACKAGE_SCHEMA,
  workspaceObjectRows,
} from '../workspace/rvmSelectedGeometryWorkspace';

const styles = {
  root: {
    flex: 1,
    display: 'grid',
    gridTemplateRows: 'auto 1fr',
    minHeight: 0,
    background: '#020617',
    color: '#e2e8f0',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderBottom: '1px solid #1f2937',
    background: '#0f172a',
  },
  title: {
    fontSize: '13px',
    fontWeight: 800,
    color: '#e5eefb',
    marginRight: '8px',
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    minHeight: '30px',
    padding: '6px 10px',
    border: '1px solid #334155',
    borderRadius: '6px',
    background: '#111827',
    color: '#dbeafe',
    fontSize: '12px',
    cursor: 'pointer',
  },
  fileInput: {
    display: 'none',
  },
  status: {
    marginLeft: 'auto',
    maxWidth: '38%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: '#93c5fd',
    fontSize: '12px',
  },
  statusError: {
    color: '#fecaca',
  },
  body: {
    minHeight: 0,
    display: 'grid',
    gridTemplateColumns: '280px minmax(0, 1fr)',
  },
  side: {
    minHeight: 0,
    overflow: 'auto',
    borderRight: '1px solid #1f2937',
    background: '#08111f',
    padding: '12px',
  },
  main: {
    minHeight: 0,
    overflow: 'auto',
    padding: '12px',
  },
  section: {
    display: 'grid',
    gap: '8px',
    marginBottom: '12px',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 800,
    color: '#93c5fd',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  metricGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '7px',
  },
  metric: {
    display: 'grid',
    gap: '2px',
    padding: '8px',
    border: '1px solid #1f3655',
    borderRadius: '6px',
    background: '#0b1524',
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: '10px',
  },
  metricValue: {
    color: '#f8fafc',
    fontSize: '17px',
    fontWeight: 800,
  },
  metaRow: {
    display: 'grid',
    gridTemplateColumns: '96px minmax(0, 1fr)',
    gap: '8px',
    alignItems: 'start',
    padding: '6px 0',
    borderBottom: '1px solid #172033',
    fontSize: '11px',
  },
  metaLabel: {
    color: '#94a3b8',
  },
  metaValue: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: '#e2e8f0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '11px',
  },
  th: {
    position: 'sticky',
    top: 0,
    padding: '7px 8px',
    background: '#0f172a',
    borderBottom: '1px solid #334155',
    color: '#93c5fd',
    textAlign: 'left',
    zIndex: 1,
  },
  td: {
    padding: '7px 8px',
    borderBottom: '1px solid #1f2937',
    color: '#dbe4f0',
    verticalAlign: 'top',
  },
  empty: {
    padding: '24px',
    color: '#94a3b8',
    fontSize: '13px',
  },
  badge: {
    display: 'inline-flex',
    minWidth: '68px',
    justifyContent: 'center',
    padding: '2px 6px',
    border: '1px solid #334155',
    borderRadius: '999px',
    color: '#dbeafe',
    background: '#111827',
    fontSize: '10px',
  },
};

export default function RvmWorkspaceTab() {
  const fileInputRef = useRef(null);
  const [statusMessage, setStatusMessage] = useState('Waiting for RVM workspace package.');
  const workspace = useRvmWorkspaceStore(state => state.workspace);
  const summary = useRvmWorkspaceStore(state => state.summary);
  const status = useRvmWorkspaceStore(state => state.status);
  const lastError = useRvmWorkspaceStore(state => state.lastError);
  const importWorkspacePackage = useRvmWorkspaceStore(state => state.importWorkspacePackage);
  const setWorkspaceError = useRvmWorkspaceStore(state => state.setWorkspaceError);
  const clearWorkspace = useRvmWorkspaceStore(state => state.clearWorkspace);
  const objectRows = useMemo(() => workspaceObjectRows(workspace, 250), [workspace]);

  const importPackageWithStatus = useCallback((packageJson, importSource) => {
    try {
      importWorkspacePackage(packageJson, importSource);
      setStatusMessage(`Imported RVM workspace package from ${importSource}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setWorkspaceError(message);
      setStatusMessage(message);
    }
  }, [importWorkspacePackage, setWorkspaceError]);

  useEffect(() => {
    function handleMessage(event) {
      const data = event.data || {};
      if (data.type !== RVM_SELECTED_GEOMETRY_POST_MESSAGE_TYPE) return;
      const packageJson = data.packageJson || data.package || data.payload;
      importPackageWithStatus(packageJson, `postMessage:${event.origin || 'unknown'}`);
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [importPackageWithStatus]);

  async function handleFileChange(event) {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    try {
      const rawText = await file.text();
      const packageJson = JSON.parse(rawText);
      importWorkspacePackage(packageJson, `file:${file.name}`);
      setStatusMessage(`Imported ${file.name}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setWorkspaceError(message);
      setStatusMessage(message);
    } finally {
      event.target.value = '';
    }
  }

  function importPendingPackage() {
    try {
      const packageJson = readPendingWorkspacePackage();
      importWorkspacePackage(packageJson, 'browser-storage:pending');
      setStatusMessage('Imported pending RVM workspace package.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setWorkspaceError(message);
      setStatusMessage(message);
    }
  }

  function exportWorkspaceSnapshot() {
    if (!workspace) return;
    const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${workspace.source?.sourceFileName || 'rvm'}_simplified_analysis_workspace.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function clearImportedWorkspace() {
    clearWorkspace();
    setStatusMessage('Workspace cleared.');
  }

  const effectiveStatus = lastError || statusMessage;

  return (
    <div style={styles.root}>
      <div style={styles.toolbar}>
        <span style={styles.title}>RVM Workspace</span>
        <button type="button" style={styles.button} onClick={() => fileInputRef.current?.click()}>
          <Upload size={14} /> Import JSON
        </button>
        <button type="button" style={styles.button} onClick={importPendingPackage}>
          <Inbox size={14} /> Pending
        </button>
        <button type="button" style={styles.button} onClick={exportWorkspaceSnapshot} disabled={!workspace}>
          <Download size={14} /> Export
        </button>
        <button type="button" style={styles.button} onClick={clearImportedWorkspace}>
          <Trash2 size={14} /> Clear
        </button>
        <input ref={fileInputRef} type="file" accept=".json" style={styles.fileInput} onChange={handleFileChange} />
        <span style={{ ...styles.status, ...(status === 'error' ? styles.statusError : {}) }}>{effectiveStatus}</span>
      </div>

      <div style={styles.body}>
        <aside style={styles.side}>
          <section style={styles.section}>
            <div style={styles.sectionTitle}>Import Summary</div>
            <div style={styles.metricGrid}>
              {metric('Objects', summary?.objects)}
              {metric('Pipes', summary?.pipes)}
              {metric('Supports', summary?.supports)}
              {metric('Branches', summary?.branches)}
              {metric('Resolved', summary?.resolved)}
              {metric('Conflicts', summary?.conflicts)}
            </div>
          </section>
          <section style={styles.section}>
            <div style={styles.sectionTitle}>Source</div>
            {metaRow('Schema', workspace?.schema || RVM_SELECTED_GEOMETRY_WORKSPACE_PACKAGE_SCHEMA)}
            {metaRow('Model', workspace?.source?.sourceModelName || '-')}
            {metaRow('File', workspace?.source?.sourceFileName || '-')}
            {metaRow('Scope', workspace?.source?.scopeMode || '-')}
            {metaRow('Imported', workspace?.importedAt || '-')}
            {metaRow('Hash', workspace?.packageHash || '-')}
          </section>
          <section style={styles.section}>
            <div style={styles.sectionTitle}>Diagnostics</div>
            {diagnosticRows(summary?.diagnostics)}
          </section>
        </aside>
        <main style={styles.main}>
          {workspace ? renderObjectTable(objectRows, summary?.objects || 0) : <div style={styles.empty}>No RVM workspace package imported.</div>}
        </main>
      </div>
    </div>
  );
}

function readPendingWorkspacePackage() {
  const rawText = window.sessionStorage?.getItem(PENDING_WORKSPACE_PACKAGE_STORAGE_KEY)
    || window.localStorage?.getItem(PENDING_WORKSPACE_PACKAGE_STORAGE_KEY)
    || '';
  if (!rawText) throw new Error(`No pending package found at ${PENDING_WORKSPACE_PACKAGE_STORAGE_KEY}.`);
  return JSON.parse(rawText);
}

function metric(label, value) {
  return (
    <div style={styles.metric} key={label}>
      <span style={styles.metricLabel}>{label}</span>
      <strong style={styles.metricValue}>{Number(value || 0)}</strong>
    </div>
  );
}

function metaRow(label, value) {
  return (
    <div style={styles.metaRow} key={label}>
      <span style={styles.metaLabel}>{label}</span>
      <span style={styles.metaValue} title={String(value || '-')}>{String(value || '-')}</span>
    </div>
  );
}

function diagnosticRows(diagnostics) {
  const rows = Array.isArray(diagnostics) ? diagnostics.slice(0, 8) : [];
  if (!rows.length) return <div style={styles.empty}>No diagnostics.</div>;
  return rows.map((row) => (
    <div style={styles.metaRow} key={row.objectId || row.objectName}>
      <span style={styles.metaLabel}>{row.type || 'OBJECT'}</span>
      <span style={styles.metaValue} title={row.objectName || row.objectId || '-'}>{row.objectName || row.objectId || '-'}</span>
    </div>
  ));
}

function renderObjectTable(rows, totalCount) {
  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Status</th>
          <th style={styles.th}>Type</th>
          <th style={styles.th}>Name</th>
          <th style={styles.th}>Line</th>
          <th style={styles.th}>Class</th>
          <th style={styles.th}>Source Path</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id || row.name}>
            <td style={styles.td}><span style={statusBadgeStyle(row.status)}>{row.status}</span></td>
            <td style={styles.td}>{row.type || '-'}</td>
            <td style={styles.td}>{row.name || row.id || '-'}</td>
            <td style={styles.td}>{row.lineNo || '-'}</td>
            <td style={styles.td}>{row.pipingClass || '-'}</td>
            <td style={styles.td}>{row.sourcePath || '-'}</td>
          </tr>
        ))}
        {totalCount > rows.length && (
          <tr>
            <td style={styles.td} colSpan={6}>Showing {rows.length} of {totalCount} objects.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function statusBadgeStyle(status) {
  const colors = {
    resolved: '#14532d',
    review: '#713f12',
    conflict: '#7f1d1d',
    missing: '#1f2937',
  };
  return {
    ...styles.badge,
    background: colors[status] || '#111827',
  };
}
