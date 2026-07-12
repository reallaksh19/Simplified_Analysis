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

function BranchNode({ branch, rowById, selectedObjectId, selectObject, filterText, level = 0 }) {
  const [open, setOpen] = useState(level < 1 || Boolean(filterText));
  
  // A branch is "selected" if its exact ID is the selectedObjectId (for folders)
  const isSelected = branch.id === selectedObjectId;
  const isBranchSelected = branch.objectIds.includes(selectedObjectId);
  
  const branchRows = (branch.directObjectIds || []).map((id) => rowById.get(id)).filter(Boolean);
  const visibleRows = branchRows.filter((row) => matchesFilter(branch, row, filterText));
  
  const hasVisibleChildren = (branch.children || []).some(child => 
    !filterText || child.objectIds.some(id => matchesFilter(child, rowById.get(id), filterText)) || child.label.toLowerCase().includes(filterText)
  );

  if (filterText && !visibleRows.length && !hasVisibleChildren && !String(branch.label).toLowerCase().includes(filterText)) return null;
  return (
    <div className="cw-tree-branch" style={{ marginLeft: `${level > 0 ? 12 : 0}px` }}>
      <button 
        type="button" 
        className={`cw-tree-branch-head ${isSelected ? 'is-selected' : isBranchSelected ? 'is-active-path' : ''}`} 
        onClick={() => {
          selectObject(branch.id);
          if (!open) setOpen(true);
        }}
        onDoubleClick={() => setOpen(!open)}
      >
        <span onClick={(e) => { e.stopPropagation(); setOpen(!open); }} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px' }}>
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        <strong>{branch.label}</strong>
        <em>{branch.objectCount}</em>
      </button>
      {open && (
        <div className="cw-tree-children">
          {(branch.children || []).map(child => (
            <BranchNode
              key={child.id}
              branch={child}
              rowById={rowById}
              selectedObjectId={selectedObjectId}
              selectObject={selectObject}
              filterText={filterText}
              level={level + 1}
            />
          ))}
          {visibleRows.map((row) => (
            <button
              type="button"
              key={row.id}
              className={row.id === selectedObjectId ? 'cw-tree-object is-selected' : 'cw-tree-object'}
              onClick={() => selectObject(row.id)}
              title={row.sourcePath || row.name}
              style={{ paddingLeft: '24px' }}
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
