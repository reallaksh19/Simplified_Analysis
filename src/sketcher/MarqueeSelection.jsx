import React, { useState, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useSketchStore } from './SketcherStore';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

export const MarqueeSelection = () => {
    const { gl, camera } = useThree();
    const { activeTool, nodes, segments, setSelectedItems } = useSketchStore();
    const [isSelecting, setIsSelecting] = useState(false);
    const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
    const [endPoint, setEndPoint] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (activeTool !== 'select') return;

        const canvas = gl?.domElement;
        if (!canvas) return;

        const onPointerDown = (e) => {
            if (e.button !== 0) return; // Only left click
            // Prevent marquee if we click a node directly (handled in InteractivePlane/GraphRenderer)
            if (e.target.tagName !== 'CANVAS') return;

            const rect = canvas.getBoundingClientRect();
            setStartPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            setEndPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            setIsSelecting(true);
        };

        const onPointerMove = (e) => {
            if (!isSelecting) return;
            const rect = canvas.getBoundingClientRect();
            setEndPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        };

        const onPointerUp = () => {
            if (!isSelecting) return;
            setIsSelecting(false);

            // Compute Selection
            const minX = Math.min(startPoint.x, endPoint.x);
            const maxX = Math.max(startPoint.x, endPoint.x);
            const minY = Math.min(startPoint.y, endPoint.y);
            const maxY = Math.max(startPoint.y, endPoint.y);

            // Basic skip if box is too small
            if (Math.abs(maxX - minX) < 5 && Math.abs(maxY - minY) < 5) {
                return;
            }

            const selectedNodes = [];
            const selectedSegments = [];

            // Helper to project 3D point to 2D screen space
            const toScreenPosition = (objVec3) => {
                const vector = objVec3.clone().project(camera);
                const widthHalf = canvas.clientWidth / 2;
                const heightHalf = canvas.clientHeight / 2;
                return {
                    x: (vector.x * widthHalf) + widthHalf,
                    y: -(vector.y * heightHalf) + heightHalf
                };
            };

            // Check Nodes
            Object.entries(nodes).forEach(([id, node]) => {
                const sp = toScreenPosition(new THREE.Vector3(...node.pos));
                if (sp.x >= minX && sp.x <= maxX && sp.y >= minY && sp.y <= maxY) {
                    selectedNodes.push(id);
                }
            });

            // Check Segments
            segments.forEach(seg => {
                const n1 = nodes[seg.startNode];
                const n2 = nodes[seg.endNode];
                if (!n1 || !n2) return;

                const startVec = new THREE.Vector3(...n1.pos);
                const endVec = new THREE.Vector3(...n2.pos);
                const midVec = startVec.clone().add(endVec.clone().sub(startVec).multiplyScalar(0.5));

                const sp1 = toScreenPosition(startVec);
                const sp2 = toScreenPosition(endVec);
                const spMid = toScreenPosition(midVec);

                // Crossing logic
                const inBox = (p) => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;

                if (inBox(sp1) || inBox(sp2) || inBox(spMid)) {
                    selectedSegments.push(seg.id);
                }
            });

            setSelectedItems({ nodes: selectedNodes, segments: selectedSegments });
        };

        canvas.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);

        return () => {
            canvas.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };
    }, [activeTool, isSelecting, startPoint, endPoint, gl, camera, nodes, segments, setSelectedItems]);

    if (!isSelecting) return null;

    const left = Math.min(startPoint.x, endPoint.x);
    const top = Math.min(startPoint.y, endPoint.y);
    const width = Math.abs(startPoint.x - endPoint.x);
    const height = Math.abs(startPoint.y - endPoint.y);

    return (
        <Html
            position={[0, 0, 0]}
            zIndexRange={[100, 0]}
            style={{
                position: 'fixed',
                left: `${left}px`,
                top: `${top}px`,
                width: `${width}px`,
                height: `${height}px`,
                border: '1px solid rgba(59, 130, 246, 0.8)',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                pointerEvents: 'none',
                transform: 'none',
                transformOrigin: 'top left',
            }}
        />
    );
};

export default MarqueeSelection;
