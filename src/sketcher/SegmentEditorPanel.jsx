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
const TYPES = ['PIPE', 'VALVE', 'FLANGE', 'FLANGE_VALVE_FLANGE', 'REDUCER', 'TEE', 'SUPPORT', 'BRANCH LEG'];

const MATERIAL_DENSITY_BY_MATERIAL = {
    'CARBON STEEL': 7850,
    'STAINLESS STEEL': 8000,
    'ALLOY STEEL': 7850,
    'DUPLEX': 7800,
    'COPPER': 8960,
    'PVC': 1380,
};

function numberOrUndefined(value) {
    if (value === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function formatPlacementNumber(value, digits = 6) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 'UNSPECIFIED';

    return parsed
        .toFixed(digits)
        .replace(/\.0+$/, '')
        .replace(/(\.\d*?)0+$/, '$1');
}

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

    const setMany = (updates) => updateSegment(selectedSegmentId, {
        properties: { ...props, ...updates }
    });

    return (
        <div data-testid="sketcher-pipe-load-editor" style={{
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


            {props.placementWasClamped && (
                <div
                    data-testid="sketcher-component-placement-warning"
                    style={{
                        background: '#7f1d1d',
                        border: '1px solid #ef4444',
                        color: '#fca5a5',
                        padding: '8px',
                        borderRadius: '6px',
                        marginBottom: '6px',
                        fontSize: '11px',
                        lineHeight: '1.4'
                    }}
                >
                    <strong>Placement was clamped</strong><br/>
                    Requested ratio: {formatPlacementNumber(props.requestedPlacementRatio)}<br/>
                    Actual ratio: {formatPlacementNumber(props.actualPlacementRatio)}<br/>
                    Min stub: {props.minimumPipeStub_mm || 1} mm<br/>
                    Start: {formatPlacementNumber(props.componentStartDistance_mm)} mm<br/>
                    End: {formatPlacementNumber(props.componentEndDistance_mm)} mm
                </div>
            )}

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
                        value={props.pipe?.dn_mm ?? props.bore ?? 100}
                        onChange={e => {
                            const newBore = Number(e.target.value);
                            const currentSched = props.pipe?.schedule || props.schedule || 'STD';
                            const dims = getPipeDimensions(newBore, currentSched);

                            setMany({
                                bore: newBore,
                                pipe: {
                                    ...(props.pipe || {}),
                                    dn_mm: newBore,
                                    wall_mm: dims.wt,
                                    od_mm: dims.od ?? props.pipe?.od_mm ?? props.od_mm,
                                }
                            });
                        }}
                    />
                </div>

                <div style={row}>
                    <label style={lbl}>Schedule</label>
                    <select
                        style={inp}
                        value={props.pipe?.schedule || props.schedule || 'STD'}
                        onChange={e => {
                            const newSched = e.target.value;
                            const currentBore = props.pipe?.dn_mm ?? props.dn_mm ?? props.bore ?? 100;
                            const dims = getPipeDimensions(currentBore, newSched);

                            setMany({
                                schedule: newSched,
                                pipe: {
                                    ...(props.pipe || {}),
                                    schedule: newSched,
                                    wall_mm: dims.wt,
                                    od_mm: dims.od ?? props.pipe?.od_mm ?? props.od_mm,
                                }
                            });
                        }}
                    >
                        {getAvailableSchedules(props.pipe?.dn_mm ?? props.bore ?? 100).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <div style={row}>
                    <label style={lbl}>WT (mm)</label>
                    <input
                        data-testid="sketcher-pipe-wall-mm"
                        type="number" min="0.1" step="0.1"
                        style={inp}
                        value={props.pipe?.wall_mm ?? props.wt ?? getPipeDimensions(props.pipe?.dn_mm ?? props.bore ?? 100, props.pipe?.schedule || props.schedule || 'STD').wt}
                        onChange={e => {
                            const wall = numberOrUndefined(e.target.value);
                            setMany({
                                wt: wall,
                                pipe: {
                                    ...(props.pipe || {}),
                                    wall_mm: wall,
                                }
                            });
                        }}
                    />
                </div>

                <div style={row}>
                    <label style={lbl}>Material</label>
                    <select
                        data-testid="sketcher-segment-material"
                        style={inp}
                        value={props.pipe?.material || props.material || 'CARBON STEEL'}
                        onChange={e => {
                            const material = e.target.value;
                            setMany({
                                material,
                                pipe: {
                                    ...(props.pipe || {}),
                                    material,
                                    materialDensity_kg_m3: MATERIAL_DENSITY_BY_MATERIAL[material],
                                }
                            });
                        }}
                    >
                        {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>

                <div style={row}>
                    <label style={lbl}>Temp °C</label>
                    <input
                        data-testid="sketcher-segment-design-temperature-c"
                        type="number"
                        step="1"
                        style={inp}
                        value={props.operating?.designTemperature_C ?? props.designTemperature_C ?? ''}
                        placeholder="232"
                        onChange={e => setMany({ operating: { ...(props.operating || {}), designTemperature_C: numberOrUndefined(e.target.value) }})}
                    />
                </div>

                <div style={row}>
                    <label style={lbl}>Insul mm</label>
                    <input
                        data-testid="sketcher-segment-insulation-thickness-mm"
                        type="number"
                        min="0"
                        max="300"
                        step="5"
                        style={inp}
                        value={props.insulation?.thickness_mm ?? props.insulationThickness_mm ?? ''}
                        placeholder="50"
                        onChange={e => setMany({ insulation: { ...(props.insulation || {}), thickness_mm: numberOrUndefined(e.target.value) }})}
                    />
                </div>

                <div style={row}>
                    <label style={lbl}>Insul ρ</label>
                    <input
                        data-testid="sketcher-segment-insulation-density-kg-m3"
                        type="number"
                        min="0"
                        step="5"
                        style={inp}
                        value={props.insulation?.density_kg_m3 ?? props.insulationDensity_kg_m3 ?? ''}
                        placeholder="120"
                        onChange={e => setMany({ insulation: { ...(props.insulation || {}), density_kg_m3: numberOrUndefined(e.target.value) }})}
                    />
                </div>

                <div style={row}>
                    <label style={lbl}>NPS</label>
                    <input
                        data-testid="sketcher-segment-nps"
                        type="text"
                        style={inp}
                        value={props.pipe?.nps ?? props.nps ?? ''}
                        placeholder="4"
                        onChange={e => setMany({ pipe: { ...(props.pipe || {}), nps: e.target.value }})}
                    />
                </div>

                <div style={row}>
                    <label style={lbl}>OD mm</label>
                    <input
                        data-testid="sketcher-segment-od-mm"
                        type="number"
                        min="0"
                        step="0.1"
                        style={inp}
                        value={props.pipe?.od_mm ?? props.od_mm ?? ''}
                        placeholder="114.3"
                        onChange={e => setMany({ pipe: { ...(props.pipe || {}), od_mm: numberOrUndefined(e.target.value) }})}
                    />
                </div>

                <div style={row}>
                    <label style={lbl}>Pipe ρ</label>
                    <input
                        data-testid="sketcher-segment-material-density-kg-m3"
                        type="number"
                        min="0"
                        step="10"
                        style={inp}
                        value={props.pipe?.materialDensity_kg_m3 ?? props.materialDensity_kg_m3 ?? ''}
                        placeholder="7850"
                        onChange={e => setMany({ pipe: { ...(props.pipe || {}), materialDensity_kg_m3: numberOrUndefined(e.target.value) }})}
                    />
                </div>

                <div style={row}>
                    <label style={lbl}>Rating</label>
                    <input
                        data-testid="sketcher-segment-rating-class"
                        type="number"
                        min="0"
                        step="1"
                        style={inp}
                        value={props.lineClass?.ratingClass ?? props.ratingClass ?? ''}
                        placeholder="150"
                        onChange={e => setMany({ lineClass: { ...(props.lineClass || {}), ratingClass: numberOrUndefined(e.target.value) }})}
                    />
                </div>

                <div style={row}>
                    <label style={lbl}>Press barg</label>
                    <input
                        data-testid="sketcher-segment-design-pressure-barg"
                        type="number"
                        min="0"
                        step="0.1"
                        style={inp}
                        value={props.operating?.designPressure_barg ?? props.designPressure_barg ?? ''}
                        placeholder="12.5"
                        onChange={e => setMany({ operating: { ...(props.operating || {}), designPressure_barg: numberOrUndefined(e.target.value) }})}
                    />
                </div>

                <div style={row}>
                    <label style={lbl}>Fluid ρ</label>
                    <input
                        data-testid="sketcher-segment-fluid-density-kg-m3"
                        type="number"
                        min="0"
                        step="1"
                        style={inp}
                        value={props.contents?.fluidDensity_kg_m3 ?? props.fluidDensity_kg_m3 ?? ''}
                        placeholder="850"
                        onChange={e => setMany({ contents: { ...(props.contents || {}), fluidDensity_kg_m3: numberOrUndefined(e.target.value) }})}
                    />
                </div>

                <div style={row}>
                    <label style={lbl}>Comp kg</label>
                    <input
                        data-testid="sketcher-segment-component-weight-kg"
                        type="number"
                        min="0"
                        step="0.1"
                        style={inp}
                        value={props.component?.componentWeight_kg ?? props.componentWeight_kg ?? ''}
                        placeholder="0"
                        onChange={e => setMany({ componentWeight_kg: numberOrUndefined(e.target.value), component: { ...(props.component || {}), componentWeight_kg: numberOrUndefined(e.target.value) }})}
                    />
                </div>

                <div style={row}>
                    <label style={lbl}>Comp mm</label>
                    <input
                        data-testid="sketcher-segment-component-length-mm"
                        type="number"
                        min="0"
                        step="1"
                        style={inp}
                        value={props.component?.componentLength_mm ?? props.componentLength_mm ?? ''}
                        placeholder="3000"
                        onChange={e => setMany({ componentLength_mm: numberOrUndefined(e.target.value), component: { ...(props.component || {}), componentLength_mm: numberOrUndefined(e.target.value) }})}
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
