import React from 'react';
import { useSketchStore } from './SketcherStore';
import { X } from 'lucide-react';

export const NodeEditorPanel = () => {
    const { selectedNodeId, nodes, updateNode, setSelectedNodeId } = useSketchStore();

    if (!selectedNodeId || !nodes[selectedNodeId]) return null;

    const node = nodes[selectedNodeId];

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

    return (
        <div style={{
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
                    <select value={node.type} onChange={handleTypeChange} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '4px', borderRadius: '4px' }}>
                        <option value="free">Free Node</option>
                        <option value="anchor">Anchor Node</option>
                        <option value="fitting">Fitting</option>
                        <option value="elbow">Elbow</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

export default NodeEditorPanel;
