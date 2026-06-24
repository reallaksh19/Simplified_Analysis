/**
 * Functionality: shows selected element/support data in a movable, collapsible
 * translucent HUD. Parameters: selected object id, imported workspace, HUD
 * coordinates, and support-load model. Outputs: object identity, source and
 * enriched fields, plus calculated loads when available. Fallback: no selected
 * object shows an explicit selection prompt, never aggregate summary counts.
 */

import React, { useRef } from 'react';
import { useCalculationWorkspaceStore } from './useCalculationWorkspaceStore.js';
import { selectedWorkspaceObject } from './workspaceModel.js';
import './WorkspaceLoadHud.css';

export default function WorkspaceLoadHud() {
  const workspace = useCalculationWorkspaceStore((state) => state.workspace);
  const selectedObjectId = useCalculationWorkspaceStore((state) => state.selectedObjectId);
  const supportLoad = useCalculationWorkspaceStore((state) => state.supportLoad);
  const hud = useCalculationWorkspaceStore((state) => state.hud);
  const setHudPosition = useCalculationWorkspaceStore((state) => state.setHudPosition);
  const toggleHudCollapsed = useCalculationWorkspaceStore((state) => state.toggleHudCollapsed);
  const dragRef = useRef(null);
  const selectedObject = selectedWorkspaceObject(workspace, selectedObjectId);
  const input = selectedObject ? supportLoad?.inputsByPipeId?.[selectedObject.id] : null;
  const result = selectedObject ? supportLoad?.resultsByPipeId?.[selectedObject.id] : null;

  function pointerDown(event) {
    if (event.target?.closest?.('button')) return;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: hud.x, y: hud.y };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function pointerMove(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setHudPosition(drag.x + event.clientX - drag.startX, drag.y + event.clientY - drag.startY);
  }

  function pointerUp(event) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  return (
    <div
      className="cw-load-hud"
      style={{ left: hud.x, top: hud.y }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
    >
      <div className="cw-load-hud-head">
        <strong>Load HUD</strong>
        <button type="button" onClick={toggleHudCollapsed}>{hud.collapsed ? 'Expand' : 'Collapse'}</button>
      </div>
      {!hud.collapsed && (
        <div className="cw-load-hud-body">
          {selectedObject ? selectedObjectHud(selectedObject, input, result) : noSelectionHud(workspace)}
        </div>
      )}
    </div>
  );
}

function selectedObjectHud(object, input, result) {
  const enrichment = object?.attributes?.enrichment || {};
  const lineList = enrichment.lineList || {};
  const pipingClass = enrichment.pipingClass || {};
  const source = object?.sourceAttributes || {};
  const missing = result?.status?.missing || input?.readiness?.missing || [];
  return (
    <>
      <div className="cw-hud-identity">
        <strong>{object.name || object.id}</strong>
        <span>{object.type || 'OBJECT'} / {object.id || '-'}</span>
      </div>
      <div className="cw-hud-fields">
        {field('Line', lineList.lineNo || source.LINE_NO || source.LINENO)}
        {field('Class', pipingClass.className || source.PIPING_CLASS || source.CLASS)}
        {field('Support', source.SUPPORT_TAG || source.SUPPORT_TYPE || source.PS || source.REF)}
        {field('Source', object.sourcePath)}
      </div>
      <div className="cw-hud-grid">
        {metric('VerticalN_A', result?.vertical?.VerticalN_A)}
        {metric('VerticalN_DEP', result?.vertical?.VerticalN_DEP)}
        {metric('Guide_H_A', result?.guide?.guideHA)}
        {metric('LineStop_H', result?.lineStop?.lineStopH)}
      </div>
      {!result && <div className="cw-hud-note">No support-load result is tied to this selected object yet.</div>}
      {missing.length > 0 && <div className="cw-hud-note">Missing: {missing.slice(0, 6).join(', ')}</div>}
    </>
  );
}

function noSelectionHud(workspace) {
  if (!workspace) {
    return <div className="cw-hud-empty">Import a package, then select an element or support.</div>;
  }
  return <div className="cw-hud-empty">Select an element/support from the canvas, hierarchy, or table.</div>;
}

function field(label, value) {
  return (
    <div className="cw-hud-field" key={label}>
      <span>{label}</span>
      <strong title={stringOrDash(value)}>{stringOrDash(value)}</strong>
    </div>
  );
}

function metric(label, value) {
  return (
    <div className="cw-hud-metric" key={label}>
      <span>{label}</span>
      <strong>{value === null || value === undefined ? '-' : String(value)}</strong>
    </div>
  );
}

function stringOrDash(value) {
  const text = String(value ?? '').trim();
  return text || '-';
}
