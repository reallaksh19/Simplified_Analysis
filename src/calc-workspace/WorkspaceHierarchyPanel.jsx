/**
 * Functionality: renders the workspace hierarchy/layer panel for imported RVM
 * packages. Parameters: hierarchy rows, workspace summary, selected object id,
 * and layer visibility state. Outputs: branch/object selection actions and
 * visibility toggles. Fallback: empty hierarchy displays import guidance.
 */

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useCalculationWorkspaceStore } from './useCalculationWorkspaceStore.js';
import { workspaceObjectRows } from './workspaceModel.js';

export default function WorkspaceHierarchyPanel() {
  const workspace = useCalculationWorkspaceStore((state) => state.workspace);
  const hierarchy = useCalculationWorkspaceStore((state) => state.hierarchy);
  const selectedObjectId = useCalculationWorkspaceStore((state) => state.selectedObjectId);
  const selectObject = useCalculationWorkspaceStore((state) => state.selectObject);
  const layerVisibility = useCalculationWorkspaceStore((state) => state.layerVisibility);
  const setLayerVisibility = useCalculationWorkspaceStore((state) => state.setLayerVisibility);
  const [filterText, setFilterText] = useState('');
  const rows = useMemo(() => workspaceObjectRows(workspace, 10000), [workspace]);
  const rowById = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows]);
  const normalizedFilter = filterText.trim().toLowerCase();

  return (
    <aside className="cw-left-panel">
      <section className="cw-panel-section">
        <div className="cw-section-title">Dataset Tree</div>
        <input
          className="cw-filter-input"
          value={filterText}
          onChange={(event) => setFilterText(event.target.value)}
          placeholder="Filter branch or object..."
        />
      </section>
      <section className="cw-panel-section">
        <div className="cw-section-title">Layers</div>
        {layerToggle('Pipes', 'pipes', layerVisibility, setLayerVisibility)}
        {layerToggle('Supports', 'supports', layerVisibility, setLayerVisibility)}
        {layerToggle('Centerlines', 'centerlines', layerVisibility, setLayerVisibility)}
        {layerToggle('Labels', 'labels', layerVisibility, setLayerVisibility)}
      </section>
      <section className="cw-tree-list">
        {!hierarchy.length && <div className="cw-empty">No workspace package imported.</div>}
        {hierarchy.map((branch) => (
          <BranchNode
            key={branch.id}
            branch={branch}
            rowById={rowById}
            selectedObjectId={selectedObjectId}
            selectObject={selectObject}
            filterText={normalizedFilter}
          />
        ))}
      </section>
    </aside>
  );
}

function BranchNode({ branch, rowById, selectedObjectId, selectObject, filterText }) {
  const [open, setOpen] = useState(true);
  const branchRows = branch.objectIds.map((id) => rowById.get(id)).filter(Boolean);
  const visibleRows = branchRows.filter((row) => matchesFilter(branch, row, filterText));
  if (filterText && !visibleRows.length && !String(branch.label).toLowerCase().includes(filterText)) return null;
  return (
    <div className="cw-tree-branch">
      <button type="button" className="cw-tree-branch-head" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <strong>{branch.label}</strong>
        <em>{branch.objectCount}</em>
      </button>
      {open && (
        <div className="cw-tree-children">
          {visibleRows.map((row) => (
            <button
              type="button"
              key={row.id}
              className={row.id === selectedObjectId ? 'cw-tree-object is-selected' : 'cw-tree-object'}
              onClick={() => selectObject(row.id)}
              title={row.sourcePath || row.name}
            >
              <span className={`cw-status-dot status-${row.status}`} />
              <span>{row.name || row.id}</span>
              <em>{row.type}</em>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function layerToggle(label, layer, layerVisibility, setLayerVisibility) {
  return (
    <label className="cw-layer-toggle" key={layer}>
      <span>{label}</span>
      <input
        type="checkbox"
        checked={Boolean(layerVisibility[layer])}
        onChange={(event) => setLayerVisibility(layer, event.target.checked)}
      />
    </label>
  );
}

function matchesFilter(branch, row, filterText) {
  if (!filterText) return true;
  return [
    branch.label,
    row.id,
    row.name,
    row.type,
    row.lineNo,
    row.pipingClass,
    row.sourcePath,
  ].some((value) => String(value || '').toLowerCase().includes(filterText));
}
