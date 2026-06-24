/**
 * Functionality: renders imported geometry rows and support-load result columns
 * in the workspace bottom panel. Parameters: current workspace, selection id,
 * and support-load model. Outputs: selectable table rows and real calculated
 * values. Fallback: empty state appears before package import.
 */

import React, { useMemo } from 'react';
import { useCalculationWorkspaceStore } from './useCalculationWorkspaceStore.js';
import { resultRows } from './supportLoadEngine.js';
import { workspaceObjectRows } from './workspaceModel.js';

export default function WorkspaceGeometryTable() {
  const workspace = useCalculationWorkspaceStore((state) => state.workspace);
  const selectedObjectId = useCalculationWorkspaceStore((state) => state.selectedObjectId);
  const selectObject = useCalculationWorkspaceStore((state) => state.selectObject);
  const supportLoad = useCalculationWorkspaceStore((state) => state.supportLoad);
  const objectRows = useMemo(() => workspaceObjectRows(workspace, 1000), [workspace]);
  const loadRows = useMemo(() => new Map(resultRows(supportLoad).map((row) => [row.pipeId, row])), [supportLoad]);

  if (!workspace) {
    return <div className="cw-table-empty">No imported workspace package.</div>;
  }

  return (
    <div className="cw-table-wrap">
      <table className="cw-geometry-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Type</th>
            <th>Name</th>
            <th>Line</th>
            <th>Class</th>
            <th>Length mm</th>
            <th>VerticalN_A</th>
            <th>Guide_H_A</th>
            <th>LineStop_H</th>
            <th>Source Path</th>
          </tr>
        </thead>
        <tbody>
          {objectRows.map((row) => {
            const load = loadRows.get(row.id);
            return (
              <tr
                key={row.id}
                className={row.id === selectedObjectId ? 'is-selected' : ''}
                onClick={() => selectObject(row.id)}
              >
                <td><span className={`cw-status-pill status-${row.status}`}>{row.status}</span></td>
                <td>{row.type || '-'}</td>
                <td>{row.name || row.id}</td>
                <td>{row.lineNo || '-'}</td>
                <td>{row.pipingClass || '-'}</td>
                <td>{formatNumber(row.lengthMm)}</td>
                <td>{formatNumber(load?.verticalNA)}</td>
                <td>{formatNumber(load?.guideHA)}</td>
                <td>{formatNumber(load?.lineStopH)}</td>
                <td title={row.sourcePath}>{row.sourcePath || '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '-';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return String(Math.round(numeric * 1000) / 1000);
}
