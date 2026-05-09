import React from 'react';
import { useSketchStore } from './SketcherStore';
import SketcherMasterDbInsertPanel from './SketcherMasterDbInsertPanel.jsx';
import { X, Trash2 } from 'lucide-react';
import * as THREE from 'three';
import { getAvailableSchedules, getPipeDimensions } from '../core/geometry/pipeSchedules.js';
import {
    DEFAULT_PIPE_CLASS,
    getSegmentPipeClass,
    updateSegmentPipeClass,
    validateSegmentPipeProperties,
} from './pipeProperties/pipePropertyModel.js';

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

const lbl = { fontSize: '11px', color: '#94a3b8', minWidth: '82px' };
const section = { fontSize: '10px', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '6px', borderTop: '1px solid #334155', paddingTop: '8px' };

const MATERIALS = ['CARBON STEEL', 'A106-B', 'STAINLESS STEEL', 'SS304', 'SS316', 'ALLOY STEEL', 'DUPLEX', 'COPPER', 'PVC'];
const TYPES = ['PIPE', 'REDUCER', 'FLANGE', 'BRANCH LEG'];

export const SegmentEditorPanel = () => {
    const {
        selectedSegmentId, segments, nodes, defaultPipeClass,
        setSelectedSegmentId, updateSegment, deleteSegment,
    } = useSketchStore();

    if (!selectedSegmentId) return null;
    const seg = segments.find(s => s.id === selectedSegmentId);
    if (!seg) return null;

    const n1 = nodes[seg.startNode];
    const n2 = nodes[seg.endNode];
    const length = (n1 && n2)
        ? new THREE.Vector3(...n1.pos).distanceTo(new THREE.Vector3(...n2.pos))
        : 0;

    const pipeClass = getSegmentPipeClass(seg, defaultPipeClass || DEFAULT_PIPE_CLASS);
    const validation = validateSegmentPipeProperties(seg);

    const set = (sectionName, key, val) => {
        const next = updateSegmentPipeClass(seg, sectionName, key, val, defaultPipeClass || DEFAULT_PIPE_CLASS);
        updateSegment(selectedSegmentId, next);
    };

    const setProp = (key, val) => updateSegment(selectedSegmentId, {
        properties: { ...(seg.properties || {}), [key]: val },
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
            width: '315px',
            maxHeight: '82vh',
            overflow: 'auto',
            zIndex: 100,
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            fontSize: '12px',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#f59e0b' }}>
                    Segment: {selectedSegmentId}
                </span>
                <button onClick={() => setSelectedSegmentId(null)}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                    <X size={15} />
                </button>
            </div>

            <div style={{ ...row, marginBottom: '6px' }}>
                <span style={lbl}>Route</span>
                <span style={{ color: '#cbd5e1' }}>{seg.startNode} → {seg.endNode}</span>
            </div>
            <div style={{ ...row, marginBottom: '10px' }}>
                <span style={lbl}>Length</span>
                <span style={{ color: '#a3e635', fontWeight: 'bold' }}>{(length / 1000).toFixed(3)} m</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <SketcherMasterDbInsertPanel segmentId={selectedSegmentId} />

                <div style={section}>Pipe</div>

                <div style={row}>
                    <label style={lbl}>Type</label>
                    <select style={inp} value={seg.properties?.type || seg.type || 'PIPE'} onChange={e => setProp('type', e.target.value)}>
                        {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                <div style={row}>
                    <label style={lbl}>Bore (DN)</label>
                    <input
                        type="number" min="10" max="1200" step="25"
                        style={inp}
                        value={pipeClass.pipe?.dn ?? 100}
                        onChange={e => {
                            const newBore = Number(e.target.value);
                            const currentSched = pipeClass.pipe?.schedule || 'STD';
                            const dims = getPipeDimensions(newBore, currentSched);
                            let next = updateSegmentPipeClass(seg, 'pipe', 'dn', newBore, defaultPipeClass || DEFAULT_PIPE_CLASS);
                            next = updateSegmentPipeClass(next, 'pipe', 'wall_mm', dims.wt, defaultPipeClass || DEFAULT_PIPE_CLASS);
                            updateSegment(selectedSegmentId, next);
                        }}
                    />
                </div>

                <div style={row}>
                    <label style={lbl}>Schedule</label>
                    <select
                        style={inp}
                        value={pipeClass.pipe?.schedule || 'STD'}
                        onChange={e => {
                            const newSched = e.target.value;
                            const currentBore = pipeClass.pipe?.dn ?? 100;
                            const dims = getPipeDimensions(currentBore, newSched);
                            let next = updateSegmentPipeClass(seg, 'pipe', 'schedule', newSched, defaultPipeClass || DEFAULT_PIPE_CLASS);
                            next = updateSegmentPipeClass(next, 'pipe', 'wall_mm', dims.wt, defaultPipeClass || DEFAULT_PIPE_CLASS);
                            updateSegment(selectedSegmentId, next);
                        }}
                    >
                        {getAvailableSchedules(pipeClass.pipe?.dn ?? 100).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <div style={row}>
                    <label style={lbl}>WT (mm)</label>
                    <input
                        type="number" min="0.1" step="0.1"
                        style={inp}
                        value={pipeClass.pipe?.wall_mm ?? getPipeDimensions(pipeClass.pipe?.dn ?? 100, pipeClass.pipe?.schedule || 'STD').wt}
                        onChange={e => set('pipe', 'wall_mm', Number(e.target.value))}
                    />
                </div>

                <div style={row}>
                    <label style={lbl}>Material</label>
                    <select style={inp} value={pipeClass.pipe?.material || 'CARBON STEEL'} onChange={e => set('pipe', 'material', e.target.value)}>
                        {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>

                <div style={section}>Line / Component Class</div>

                <div style={row}>
                    <label style={lbl}>Rating Class</label>
                    <select
                        data-testid="segment-rating-class"
                        style={inp}
                        value={pipeClass.lineClass?.ratingClass ?? 300}
                        onChange={e => set('lineClass', 'ratingClass', Number(e.target.value))}
                    >
                        {[150, 300, 600, 900, 1500, 2500].map(rating => (
                            <option key={rating} value={rating}>CL{rating}</option>
                        ))}
                    </select>
                </div>

                <div style={row}>
                    <label style={lbl}>Face Type</label>
                    <select
                        data-testid="segment-face-type"
                        style={inp}
                        value={pipeClass.lineClass?.faceType ?? 'RF'}
                        onChange={e => set('lineClass', 'faceType', e.target.value)}
                    >
                        <option value="RF">RF</option>
                        <option value="RTJ">RTJ</option>
                        <option value="BW">BW</option>
                    </select>
                </div>

                <div style={row}>
                    <label style={lbl}>Flange Type</label>
                    <select
                        data-testid="segment-flange-type"
                        style={inp}
                        value={pipeClass.lineClass?.flangeType ?? 'WN'}
                        onChange={e => set('lineClass', 'flangeType', e.target.value)}
                    >
                        <option value="WN">Weld Neck</option>
                        <option value="SO">Slip On</option>
                        <option value="BLIND">Blind</option>
                        <option value="LJ">Lap Joint</option>
                    </select>
                </div>

                <div style={row}>
                    <label style={lbl}>Valve Type</label>
                    <input
                        data-testid="segment-valve-type"
                        type="text"
                        style={inp}
                        value={pipeClass.lineClass?.valveType ?? 'Flanged Swing check Valve'}
                        onChange={e => set('lineClass', 'valveType', e.target.value)}
                    />
                </div>

                <div style={section}>Temperature / Pressure</div>

                <div style={row}>
                    <label style={lbl}>Temp °C</label>
                    <input
                        type="number" step="5"
                        style={inp}
                        value={pipeClass.operating?.designTemperature_C ?? 150}
                        onChange={e => set('operating', 'designTemperature_C', Number(e.target.value))}
                    />
                </div>

                <div style={row}>
                    <label style={lbl}>Pressure barg</label>
                    <input
                        type="number" step="1"
                        style={inp}
                        value={pipeClass.operating?.designPressure_barg ?? 20}
                        onChange={e => set('operating', 'designPressure_barg', Number(e.target.value))}
                    />
                </div>

                <div style={section}>Fluid / Insulation</div>

                <div style={row}>
                    <label style={lbl}>Fluid kg/m³</label>
                    <input
                        type="number" step="10"
                        style={inp}
                        value={pipeClass.contents?.fluidDensity_kg_m3 ?? 1000}
                        onChange={e => set('contents', 'fluidDensity_kg_m3', Number(e.target.value))}
                    />
                </div>

                <div style={row}>
                    <label style={lbl}>Fill fraction</label>
                    <input
                        type="number" min="0" max="1" step="0.05"
                        style={inp}
                        value={pipeClass.contents?.fillFraction ?? 1}
                        onChange={e => set('contents', 'fillFraction', Number(e.target.value))}
                    />
                </div>

                <div style={row}>
                    <label style={lbl}>Insul. mm</label>
                    <input
                        type="number" min="0" max="300" step="5"
                        style={inp}
                        value={pipeClass.insulation?.thickness_mm ?? 0}
                        onChange={e => set('insulation', 'thickness_mm', Number(e.target.value))}
                    />
                </div>

                <div style={row}>
                    <label style={lbl}>Insul. kg/m³</label>
                    <input
                        type="number" min="0" max="500" step="5"
                        style={inp}
                        value={pipeClass.insulation?.density_kg_m3 ?? 120}
                        onChange={e => set('insulation', 'density_kg_m3', Number(e.target.value))}
                    />
                </div>

                <div style={section}>Calculation Flags</div>

                <label style={row}>
                    <span style={lbl}>Deadweight</span>
                    <input
                        type="checkbox"
                        checked={pipeClass.calculationFlags?.includeDeadweight !== false}
                        onChange={e => set('calculationFlags', 'includeDeadweight', e.target.checked)}
                    />
                </label>

                <label style={row}>
                    <span style={lbl}>Thermal</span>
                    <input
                        type="checkbox"
                        checked={pipeClass.calculationFlags?.includeThermal !== false}
                        onChange={e => set('calculationFlags', 'includeThermal', e.target.checked)}
                    />
                </label>

                {validation.diagnostics.length > 0 && (
                    <div style={{ border: '1px solid #f59e0b', background: '#451a03', color: '#fde68a', borderRadius: '6px', padding: '8px' }}>
                        <strong>Diagnostics</strong>
                        <ul style={{ paddingLeft: '16px', margin: '6px 0 0' }}>
                            {validation.diagnostics.map((item, index) => (
                                <li key={`${item.code}-${index}`}>{item.code}: {item.message}</li>
                            ))}
                        </ul>
                    </div>
                )}

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
