import React from 'react';
import { useSketchStore } from './SketcherStore';
import { X } from 'lucide-react';

function numberOrUndefined(value) {
    if (value === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function boolFromCheckbox(event) {
    return Boolean(event.target.checked);
}

const SUPPORT_TYPES = ['anchor', 'rest', 'guide', 'support', 'free'];

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

export const NodeEditorPanel = () => {
    const selectedNodeId = useSketchStore(s => s.selectedNodeId);
    const nodes = useSketchStore(s => s.nodes);
    const segments = useSketchStore(s => s.segments);
    const updateNode = useSketchStore(s => s.updateNode);
    const setSelectedNodeId = useSketchStore(s => s.setSelectedNodeId);

    if (!selectedNodeId || !nodes[selectedNodeId]) return null;

    const node = nodes[selectedNodeId];

    // Count how many segments connect to this node
    const connCount = segments.filter(
        s => s.startNode === selectedNodeId || s.endNode === selectedNodeId
    ).length;

    const handleCoordChange = (axis, value) => {
        const numVal = Number(value);
        if (isNaN(numVal)) return;

        const newPos = [...node.pos];
        if (axis === 'x') newPos[0] = numVal;
        if (axis === 'y') newPos[1] = numVal;
        if (axis === 'z') newPos[2] = numVal;

        updateNode(selectedNodeId, { pos: newPos });
    };

    const handleTypeChange = (e) => {
        updateNode(selectedNodeId, { type: e.target.value });
    };

    const supportType = node.supportType || node.type || 'free';
    const restraint = node.restraint || {
        x: supportType !== 'free',
        y: supportType !== 'free',
        z: supportType !== 'free',
        rx: false,
        ry: false,
        rz: false,
    };

    const updateSupportField = (updates) => {
        updateNode(selectedNodeId, {
            ...updates,
        });
    };

    const updateRestraint = (key, value) => {
        updateNode(selectedNodeId, {
            restraint: {
                ...restraint,
                [key]: value,
            },
        });
    };

    return (
        <div data-testid="sketcher-node-editor" style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            background: '#1e293b',
            border: '1px solid #3b82f6',
            borderRadius: '8px',
            padding: '16px',
            color: '#f8fafc',
            width: '250px',
            zIndex: 100,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>Node: {selectedNodeId}</h3>
                <button onClick={() => setSelectedNodeId(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                    <X size={16} />
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '12px', width: '20px' }}>X:</label>
                    <input type="number" value={node.pos[0]} onChange={(e) => handleCoordChange('x', e.target.value)} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '4px', borderRadius: '4px' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '12px', width: '20px' }}>Y:</label>
                    <input type="number" value={node.pos[1]} onChange={(e) => handleCoordChange('y', e.target.value)} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '4px', borderRadius: '4px' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '12px', width: '20px' }}>Z:</label>
                    <input type="number" value={node.pos[2]} onChange={(e) => handleCoordChange('z', e.target.value)} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '4px', borderRadius: '4px' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <label style={{ fontSize: '12px', width: '40px' }}>Type:</label>
                    <select data-testid="sketcher-node-type" value={node.type} onChange={handleTypeChange} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '4px', borderRadius: '4px' }}>
                        <option value="free">Free Node</option>
                        <option value="anchor">Anchor Node</option>
                        <option value="support">Resting Support (+Y)</option>
                        <option value="guide">Directional Guide</option>
                        <option value="fitting">Fitting (legacy)</option>
                        <option value="elbow">Elbow (needs 2 pipes)</option>
                        <option value="tee">Tee (needs 3 pipes)</option>
                        <option value="valve">Valve</option>
                        <option value="flange">Flange</option>
                        <option value="reducer">Reducer</option>
                    </select>
                    {node.type === 'elbow' && connCount < 2 && (
                        <div style={{ fontSize: '10px', color: '#f59e0b', marginTop: '4px' }}>⚠ Connect 2 pipe segments to this node for the elbow to render.</div>
                    )}
                    {node.type === 'tee' && connCount < 3 && (
                        <div style={{ fontSize: '10px', color: '#f59e0b', marginTop: '4px' }}>⚠ Connect 3 pipe segments to this node for the tee to render. ({connCount}/3 connected)</div>
                    )}
                    {node.type === 'tee' && connCount === 3 && (
                        <div style={{ fontSize: '10px', color: '#a3e635', marginTop: '4px' }}>✓ Tee fully connected (3/3)</div>
                    )}
                </div>

                {['support', 'anchor', 'rest', 'guide'].includes(String(node.type || '').toLowerCase()) && (
                <div
                    data-testid="sketcher-support-editor"
                    style={{
                        marginTop: '10px',
                        borderTop: '1px solid #334155',
                        paddingTop: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                    }}
                >
                    <div style={{ fontWeight: 700, color: '#bae6fd' }}>
                        3D Support Properties
                    </div>

                    <div style={row}>
                        <label style={lbl}>Tag</label>
                        <input
                            data-testid="sketcher-node-support-tag"
                            style={inp}
                            value={node.supportTag || ''}
                            placeholder={`SUP-${selectedNodeId}`}
                            onChange={(e) => updateSupportField({ supportTag: e.target.value })}
                        />
                    </div>

                    <div style={row}>
                        <label style={lbl}>Type</label>
                        <select
                            data-testid="sketcher-node-support-type"
                            style={inp}
                            value={supportType}
                            onChange={(e) => {
                                const nextType = e.target.value;
                                const isSupport = nextType !== 'free';

                                updateSupportField({
                                    type: nextType === 'free' ? 'free' : nextType,
                                    supportType: nextType,
                                    restraint: {
                                        x: isSupport,
                                        y: isSupport,
                                        z: isSupport,
                                        rx: false,
                                        ry: false,
                                        rz: false,
                                    },
                                });
                            }}
                        >
                            {SUPPORT_TYPES.map((item) => (
                                <option key={item} value={item}>
                                    {item}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={row}>
                        <label style={lbl}>Friction</label>
                        <input
                            data-testid="sketcher-node-friction-factor"
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            style={inp}
                            value={node.frictionFactor ?? ''}
                            placeholder="0.30"
                            onChange={(e) => updateSupportField({ frictionFactor: numberOrUndefined(e.target.value) })}
                        />
                    </div>

                    <div
                        data-testid="sketcher-node-restraint-editor"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '6px',
                            fontSize: '11px',
                        }}
                    >
                        {['x', 'y', 'z', 'rx', 'ry', 'rz'].map((key) => (
                            <label
                                key={key}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    color: '#cbd5e1',
                                }}
                            >
                                <input
                                    data-testid={`sketcher-node-restraint-${key}`}
                                    type="checkbox"
                                    checked={Boolean(restraint[key])}
                                    onChange={(e) => updateRestraint(key, boolFromCheckbox(e))}
                                />
                                {key.toUpperCase()}
                            </label>
                        ))}
                    </div>
                </div>
                )}
            </div>
        </div>
    );
};

export default NodeEditorPanel;
