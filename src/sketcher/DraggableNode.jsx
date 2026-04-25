import React, { useState } from 'react';
import { useThree } from '@react-three/fiber';
import { useSketchStore } from './SketcherStore';
import * as THREE from 'three';

export const DraggableNode = ({ id, node, is3D }) => {
    // Ensure hooks are called unconditionally
    const { camera } = useThree();
    const updateNode = useSketchStore(s => s.updateNode);
    const workingPlane = useSketchStore(s => s.workingPlane);
    const activeTool = useSketchStore(s => s.activeTool);
    const setSelectedNodeId = useSketchStore(s => s.setSelectedNodeId);
    const snapNodeId = useSketchStore(s => s.snapNodeId);
    const setSnapNodeId = useSketchStore(s => s.setSnapNodeId);
    const selectedItems = useSketchStore(s => s.selectedItems);
    const selectedNodeId = useSketchStore(s => s.selectedNodeId);

    const isSelected = selectedItems.nodes.includes(id) || selectedNodeId === id;

    const [isDragging, setIsDragging] = useState(false);

    const onPointerDown = (e) => {
        if (is3D) return;
        e.stopPropagation();

        if (activeTool === 'select') {
            setSelectedNodeId(id);
            setIsDragging(true);
            e.target.setPointerCapture(e.pointerId);
        } else {
            // Forward interaction click to store for drafting/anchor tools
            useSketchStore.getState().handleInteractionClick(e.point, id, e.shiftKey);
        }
    };

    const onPointerUp = (e) => {
        if (is3D) return;
        e.stopPropagation();
        setIsDragging(false);
        e.target.releasePointerCapture(e.pointerId);
    };

    const onPointerMove = (e) => {
        if (!isDragging || activeTool !== 'select' || is3D) return;
        e.stopPropagation();

        // Convert pointer coordinate directly to world space.
        // We use e.pointer which correctly accounts for container offsets.
        const vec = new THREE.Vector3();
        vec.set(
            e.pointer.x,
            e.pointer.y,
            0.5
        );
        vec.unproject(camera);

        const newPos = [...node.pos];

        // Constrain movement strictly to the active working plane
        // E.g., if workingPlane is XY, map Z back to original node.pos[2]
        // Since we are unprojecting from a camera that looks directly down the missing axis,
        // the unprojected vector coordinates natively map to the world axes.
        if (workingPlane === 'XY') {
            newPos[0] = vec.x;
            newPos[1] = vec.y;
        } else if (workingPlane === 'XZ') {
            newPos[0] = vec.x;
            newPos[2] = vec.z;
        } else if (workingPlane === 'YZ') {
            newPos[1] = vec.y;
            newPos[2] = vec.z;
        }

        updateNode(id, { pos: newPos });
    };

    const isAnchor = node.type === 'anchor';
    const isBend = node.type === 'elbow' || node.type === 'fitting'; // GraphTranslator uses 'elbow' and 'fitting'

    // Determine color
    let color = '#ffa500'; // default orange for free node
    if (isAnchor) color = '#ef4444'; // Red for anchor
    if (isBend) color = '#3b82f6'; // Blue for bends
    if (snapNodeId === id) color = '#facc15'; // yellow snap highlight
    if (isSelected) color = '#38bdf8'; // light blue selection

    // Determine geometry scale
    const scale = is3D ? 100 : (snapNodeId === id ? 80 : 50);

    return (
        <mesh
            position={node.pos}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerMove={onPointerMove}
            onPointerEnter={(e) => { e.stopPropagation(); setSnapNodeId(id); }}
            onPointerLeave={(e) => { e.stopPropagation(); if (snapNodeId === id) setSnapNodeId(null); }}
            userData={{ type: 'node', id: id }} // Ensure it can be targeted by Marquee if needed later
        >
            {isAnchor ? (
                // Tetrahedron resembles a Triangle/Pyramid
                <tetrahedronGeometry args={[scale * 1.5, 0]} />
            ) : (
                <sphereGeometry args={[scale, 16, 16]} />
            )}
            <meshBasicMaterial color={color} />
        </mesh>
    );
};
