import React, { useMemo, useState } from 'react';
import { useSketchStore } from './SketcherStore';
import {
  extractMasterDbInputFromSegment,
  resolveFvfForSegment,
  resolveReducerForSegment,
} from './componentProperties/segmentMasterDbInputs.js';

const box = { border: '1px solid #2563eb', background: '#020617', borderRadius: 8, padding: 10, color: '#cbd5e1', fontSize: 12 };
const title = { color: '#93c5fd', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10, marginBottom: 8 };
const button = { border: '1px solid #38bdf8', background: '#082f49', color: '#e0f2fe', borderRadius: 6, padding: '5px 7px', cursor: 'pointer', fontSize: 11 };
const inputStyle = { background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', borderRadius: 4, padding: '4px 6px', fontSize: 11, width: '100%' };

function fmt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : '—';
}

function PreviewBlock({ preview }) {
  if (!preview) return null;
  const resolved = preview.resolved || {};
  return (
    <div data-testid="sketcher-master-db-preview" style={{ marginTop: 8, background: '#0f172a', borderRadius: 6, padding: 8 }}>
      <div><strong>{preview.kind}</strong> — {preview.ok ? 'Resolved' : 'Not resolved'}</div>
      {preview.kind === 'FLANGE_VALVE_FLANGE' && (
        <>
          <div>Valve F/F: {fmt(resolved.valveFaceToFace_mm)} mm</div>
          <div>Flange thick: {fmt(resolved.flangeThickness_mm)} mm</div>
          <div>FVF length: {fmt(resolved.totalLength_mm)} mm</div>
          <div>FVF weight: {fmt(resolved.totalWeight_kg)} kg</div>
        </>
      )}
      {preview.kind === 'REDUCER' && (
        <>
          <div>Reducer length: {fmt(resolved.length_mm)} mm</div>
          <div>Reducer weight: {fmt(resolved.weight_kg)} kg</div>
        </>
      )}
      <div>Data status: {resolved.dataStatus || resolved.sourceStatus || 'UNKNOWN'}</div>
      {(preview.diagnostics || []).length > 0 && (
        <ul style={{ color: '#fde68a', paddingLeft: 16, margin: '6px 0 0' }}>
          {preview.diagnostics.map((item, index) => <li key={`${item.code}-${index}`}>{item.code}: {item.message}</li>)}
        </ul>
      )}
    </div>
  );
}

export default function SketcherMasterDbInsertPanel({ segmentId = null }) {
  const selectedSegmentId = useSketchStore((s) => s.selectedSegmentId);
  const segments = useSketchStore((s) => s.segments || []);
  const insertFvf = useSketchStore((s) => s.insertFlangeValveFlangeOnSelectedSegment);
  const insertReducer = useSketchStore((s) => s.insertReducerOnSelectedSegment);

  const activeSegmentId = segmentId || selectedSegmentId;
  const segment = segments.find((item) => item.id === activeSegmentId);
  const base = useMemo(() => extractMasterDbInputFromSegment(segment || {}), [segment]);
  const [targetDn, setTargetDn] = useState(base.targetDn);
  const [preview, setPreview] = useState(null);

  if (!segment) {
    return (
      <div data-testid="sketcher-master-db-insert-panel" style={box}>
        <div style={title}>Master DB Insert</div>
        Select a pipe segment to resolve valve/FVF or reducer from Master DB.
      </div>
    );
  }

  const overrides = { targetDn: Number(targetDn) };

  const doPreviewFvf = () => setPreview(resolveFvfForSegment(segment, overrides));
  const doPreviewReducer = () => setPreview(resolveReducerForSegment(segment, overrides));

  const doInsertFvf = () => {
    const result = resolveFvfForSegment(segment, overrides);
    setPreview(result);
    if (result.ok) insertFvf?.(result.resolved);
  };

  const doInsertReducer = () => {
    const result = resolveReducerForSegment(segment, overrides);
    setPreview(result);
    if (result.ok) insertReducer?.(result.resolved);
  };

  return (
    <div data-testid="sketcher-master-db-insert-panel" style={box}>
      <div style={title}>Master DB Insert</div>
      <div data-testid="sketcher-master-db-input-summary" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <div>DN: {base.dn}</div>
        <div>Class: CL{base.ratingClass}</div>
        <div>Face: {base.faceType}</div>
        <div>Flange: {base.flangeType}</div>
        <div style={{ gridColumn: '1 / span 2' }}>Valve: {base.valveType}</div>
        <label style={{ gridColumn: '1 / span 2' }}>
          Reducer target DN
          <input data-testid="sketcher-master-db-reducer-target-dn" style={inputStyle} type="number" value={targetDn} onChange={(event) => setTargetDn(Number(event.target.value))} />
        </label>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        <button data-testid="sketcher-master-db-preview-fvf" type="button" style={button} onClick={doPreviewFvf}>Preview FVF</button>
        <button data-testid="sketcher-master-db-insert-fvf" type="button" style={button} onClick={doInsertFvf}>Insert FVF</button>
        <button data-testid="sketcher-master-db-preview-reducer" type="button" style={button} onClick={doPreviewReducer}>Preview Reducer</button>
        <button data-testid="sketcher-master-db-insert-reducer" type="button" style={button} onClick={doInsertReducer}>Insert Reducer</button>
      </div>
      <PreviewBlock preview={preview} />
    </div>
  );
}
