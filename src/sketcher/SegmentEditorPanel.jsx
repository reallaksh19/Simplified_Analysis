import React from 'react';
import { useSketchStore } from './SketcherStore';
import { X, Trash2 } from 'lucide-react';
import * as THREE from 'three';
import { getAvailableSchedules, getPipeDimensions } from '../core/geometry/pipeSchedules';
import { listSketcherMasterComponentRows } from './masterDb/sketcherMasterComponentDb.js';

const inp = {
    width: '100%',
    background: '#0f172a',
    border: '1px solid #334155',
    color: '#f8fafc',
    padding: '4px 6px',
    borderRadius: '4px',
    fontSize: '12px',
};

const row = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
};

const lbl = { fontSize: '11px', color: '#94a3b8', minWidth: '60px' };

const MATERIALS = ['CARBON STEEL', 'STAINLESS STEEL', 'ALLOY STEEL', 'DUPLEX', 'COPPER', 'PVC'];
const TYPES = ['PIPE', 'REDUCER', 'FLANGE', 'BRANCH LEG'];

export const SegmentEditorPanel = () => {
    const {
        selectedSegmentId, segments, nodes,
        setSelectedSegmentId, updateSegment, deleteSegment,
        applyMasterDbComponentToSegment,
    } = useSketchStore();

    if (!selectedSegmentId) return null;
    const seg = segments.find(s => s.id === selectedSegmentId);
    if (!seg) return null;

    const n1 = nodes[seg.startNode];
    const n2 = nodes[seg.endNode];
    const length = (n1 && n2)
        ? new THREE.Vector3(...n1.pos).distanceTo(new THREE.Vector3(...n2.pos))
        : 0;

    const props = seg.properties || {};
    const masterRows = listSketcherMasterComponentRows();

    const set = (key, val) => updateSegment(selectedSegmentId, {
        properties: { ...props, [key]: val }
    });

    return (
        <div style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            background: '#1e293b',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            padding: '14px',
            color: '#f8fafc',
            width: '260px',
            zIndex: 100,
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            fontSize: '12px',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#f59e0b' }}>
                    Segment: {selectedSegmentId}
                </span>
                <button onClick={() => setSelectedSegmentId(null)}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                    <X size={15} />
                </button>
            </div>

            {/* Read-only info */}
            <div style={{ ...row, marginBottom: '6px' }}>
                <span style={lbl}>Route</span>
                <span style={{ color: '#cbd5e1' }}>{seg.startNode} → {seg.endNode}</span>
            </div>
            <div style={{ ...row, marginBottom: '10px' }}>
                <span style={lbl}>Length</span>
                <span style={{ color: '#a3e635', fontWeight: 'bold' }}>{(length / 1000).toFixed(3)} m</span>
            </div>

            {/* Editable fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={row}>
                    <label style={lbl}>Type</label>
                    <select style={inp} value={props.type || 'PIPE'} onChange={e => set('type', e.target.value)}>
                        {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                <div style={row}>
                    <label style={lbl}>Master DB</label>
                    <select
                        data-testid="sketcher-master-db-component-select"
                        style={inp}
                        value={props.masterDbRowId || ''}
                        onChange={(e) => {
                            const rowId = e.target.value;
                            if (!rowId) return;
                            applyMasterDbComponentToSegment(selectedSegmentId, rowId);
                        }}
                    >
                        <option value="">Manual / not assigned</option>
                        {masterRows.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.displayName}
                            </option>
                        ))}
                    </select>
                </div>

                {props.masterDbRowId && (
                    <div
                        data-testid="sketcher-master-db-provenance"
                        style={{
                            border: '1px solid #334155',
                            background: '#0f172a',
                            borderRadius: '6px',
                            padding: '6px',
                            color: '#cbd5e1',
                            fontSize: '11px',
                            lineHeight: 1.35,
                        }}
                    >
                        <div>Row: {props.masterDbRowId}</div>
                        <div>Length: {props.componentLength_mm ?? 0} mm</div>
                        <div>Weight: {props.componentWeight_kg ?? 0} kg</div>
                        <div>Source: {props.propertySource || 'UNSPECIFIED'}</div>
                    </div>
                )}

                <div style={row}>
                    <label style={lbl}>Bore (DN)</label>
                    <input
                        type="number" min="10" max="1200" step="25"
                        style={inp}
                        value={props.bore ?? 100}
                        onChange={e => {
                            const newBore = Number(e.target.value);
                            const currentSched = props.schedule || 'STD';
                            const dims = getPipeDimensions(newBore, currentSched);
                            updateSegment(selectedSegmentId, {
                                properties: { ...props, bore: newBore, wt: dims.wt }
                            });
                        }}
                    />
                </div>

                <div style={row}>
                    <label style={lbl}>Schedule</label>
                    <select
                        style={inp}
                        value={props.schedule || 'STD'}
                        onChange={e => {
                            const newSched = e.target.value;
                            const currentBore = props.bore ?? 100;
                            const dims = getPipeDimensions(currentBore, newSched);
                            updateSegment(selectedSegmentId, {
                                properties: { ...props, schedule: newSched, wt: dims.wt }
                            });
                        }}
                    >
                        {getAvailableSchedules(props.bore ?? 100).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <div style={row}>
                    <label style={lbl}>WT (mm)</label>
                    <input
                        type="number" min="0.1" step="0.1"
                        style={inp}
                        value={props.wt ?? getPipeDimensions(props.bore ?? 100, props.schedule || 'STD').wt}
                        onChange={e => set('wt', Number(e.target.value))}
                    />
                </div>

                <div style={row}>
                    <label style={lbl}>Material</label>
                    <select style={inp} value={props.material || 'CARBON STEEL'} onChange={e => set('material', e.target.value)}>
                        {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>

                <div style={row}>
                    <label style={lbl}>Temp (°F)</label>
                    <input
                        type="number" step="10"
                        style={inp}
                        value={props.designTemp ?? ''}
                        placeholder="Global Default"
                        onChange={e => {
                            const val = e.target.value;
                            set('designTemp', val === '' ? undefined : Number(val));
                        }}
                    />
                </div>

                <div style={row}>
                    <label style={lbl}>Insul. (mm)</label>
                    <input
                        type="number" min="0" max="300" step="5"
                        style={inp}
                        value={props.insulation ?? 0}
                        onChange={e => set('insulation', Number(e.target.value))}
                    />
                </div>

                {/* Delete */}
                <button
                    onClick={() => deleteSegment(selectedSegmentId)}
                    style={{
                        marginTop: '6px', width: '100%',
                        background: '#7f1d1d', border: '1px solid #ef4444',
                        color: '#fca5a5', padding: '6px', borderRadius: '6px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: '6px', fontWeight: 'bold',
                    }}>
                    <Trash2 size={14} /> Delete Segment
                </button>
            </div>
        </div>
    );
};

export default SegmentEditorPanel;
