/**
 * Functionality: displays selected workspace object properties dynamically from
 * top-level, sourceAttributes, enrichment, and workspace calculation state.
 * Parameters: selected object id and current support-load model. Outputs:
 * searchable field rows and readiness/result sections. Fallback: no selection
 * shows a neutral empty state.
 */

import React, { useMemo, useState } from 'react';
import { useCalculationWorkspaceStore } from './useCalculationWorkspaceStore.js';
import { flattenDynamicProperties, selectedWorkspaceObject } from './workspaceModel.js';

export default function WorkspacePropertyPanel() {
  const workspace = useCalculationWorkspaceStore((state) => state.workspace);
  const selectedObjectId = useCalculationWorkspaceStore((state) => state.selectedObjectId);
  const supportLoad = useCalculationWorkspaceStore((state) => state.supportLoad);
  const selectedObject = selectedWorkspaceObject(workspace, selectedObjectId);
  const [filterText, setFilterText] = useState('');
  const supportInput = selectedObject ? supportLoad?.inputsByPipeId?.[selectedObject.id] : null;
  const supportResult = selectedObject ? supportLoad?.resultsByPipeId?.[selectedObject.id] : null;
  const propertyRows = useMemo(() => {
    if (!selectedObject) return [];
    return flattenDynamicProperties({
      object: selectedObject,
      supportLoadInput: supportInput || null,
      supportLoadResult: supportResult || null,
    });
  }, [selectedObject, supportInput, supportResult]);
  const normalizedFilter = filterText.trim().toLowerCase();
  const rows = normalizedFilter
    ? propertyRows.filter((row) => `${row.path} ${row.value}`.toLowerCase().includes(normalizedFilter))
    : propertyRows;

  return (
    <aside className="cw-right-panel">
      <section className="cw-panel-section">
        <div className="cw-section-title">Properties</div>
        {!selectedObject && <div className="cw-empty">Select geometry to inspect dynamic fields.</div>}
        {selectedObject && (
          <div className="cw-object-title">
            <strong>{selectedObject.name || selectedObject.id}</strong>
            <span>{selectedObject.type || 'OBJECT'}</span>
          </div>
        )}
        <input
          className="cw-filter-input"
          value={filterText}
          onChange={(event) => setFilterText(event.target.value)}
          placeholder="Filter property..."
        />
      </section>
      {selectedObject && (
        <>
          <SupportLoadQuickView input={supportInput} result={supportResult} />
          <section className="cw-property-table">
            {rows.map((row) => (
              <div className="cw-property-row" key={row.path}>
                <span title={row.path}>{row.path}</span>
                <strong title={row.value}>{row.value}</strong>
              </div>
            ))}
            {!rows.length && <div className="cw-empty">No matching fields.</div>}
          </section>
        </>
      )}
    </aside>
  );
}

function SupportLoadQuickView({ input, result }) {
  if (!input && !result) {
    return (
      <section className="cw-panel-section">
        <div className="cw-section-title">Load Calculation</div>
        <div className="cw-empty">No support-load input for this object.</div>
      </section>
    );
  }
  const missing = result?.status?.missing || input?.readiness?.missing || [];
  return (
    <section className="cw-panel-section">
      <div className="cw-section-title">Load Calculation</div>
      <div className="cw-kv-grid">
        {kv('VerticalN_A', result?.vertical?.VerticalN_A)}
        {kv('VerticalN_DEP', result?.vertical?.VerticalN_DEP)}
        {kv('Guide_H_A', result?.guide?.guideHA)}
        {kv('LineStop_H', result?.lineStop?.lineStopH)}
      </div>
      {missing.length > 0 && (
        <div className="cw-missing-list">
          <strong>Missing</strong>
          <span>{missing.join(', ')}</span>
        </div>
      )}
    </section>
  );
}

function kv(label, value) {
  return (
    <div className="cw-kv" key={label}>
      <span>{label}</span>
      <strong>{value === null || value === undefined ? '-' : String(value)}</strong>
    </div>
  );
}
