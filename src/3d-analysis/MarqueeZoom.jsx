import React, { useState, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAnalysisStore } from './AnalysisStore';

export const MarqueeZoom = () => {
    const { camera, gl, scene, controls } = useThree();
    const activeTool = useAnalysisStore(s => s.activeTool);
    const setActiveTool = useAnalysisStore(s => s.setActiveTool);

    const [startPoint, setStartPoint] = useState(null);
    const [currentPoint, setCurrentPoint] = useState(null);

    useEffect(() => {
        if (activeTool !== 'marquee') {
            setStartPoint(null);
            setCurrentPoint(null);
            // Re-enable controls
            if (controls) controls.enabled = true;
            return;
        }

        // Disable orbit controls while using marquee zoom
        if (controls) controls.enabled = false;

        const handlePointerDown = (e) => {
            if (e.button !== 0) return; // Only left click
            setStartPoint({ x: e.clientX, y: e.clientY });
            setCurrentPoint({ x: e.clientX, y: e.clientY });
        };

        const handlePointerMove = (e) => {
            if (startPoint) {
                setCurrentPoint({ x: e.clientX, y: e.clientY });
            }
        };

        const handlePointerUp = (e) => {
            if (!startPoint) return;

            const endPoint = { x: e.clientX, y: e.clientY };

            // Check if user just clicked instead of dragging
            const dist = Math.sqrt(Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2));

            if (dist > 10) {
                // We have a box. We need to find what's inside or calculate the new view bounds.
                const rect = gl.domElement.getBoundingClientRect();

                // Convert screen space box center to NDC
                const boxCenterX = (startPoint.x + endPoint.x) / 2;
                const boxCenterY = (startPoint.y + endPoint.y) / 2;

                const ndcX = ((boxCenterX - rect.left) / rect.width) * 2 - 1;
                const ndcY = -((boxCenterY - rect.top) / rect.height) * 2 + 1;

                // Raycast from the center of the marquee box
                const raycaster = new THREE.Raycaster();
                raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

                // Find intersections with all objects in the scene
                const intersects = raycaster.intersectObjects(scene.children, true);

                let targetPos = new THREE.Vector3();

                if (intersects.length > 0) {
                    targetPos.copy(intersects[0].point);
                } else {
                    // Fallback: ray intersect with a plane passing through controls target
                    const targetPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion), 0);
                    targetPlane.translate(controls ? controls.target : new THREE.Vector3());
                    raycaster.ray.intersectPlane(targetPlane, targetPos);
                }

                if (targetPos) {
                    // Calculate zoom ratio based on the larger dimension of the marquee box
                    const boxWidth = Math.abs(endPoint.x - startPoint.x);
                    const boxHeight = Math.abs(endPoint.y - startPoint.y);

                    const maxScreenDim = Math.max(rect.width, rect.height);
                    const maxBoxDim = Math.max(boxWidth, boxHeight);

                    const zoomRatio = maxScreenDim / maxBoxDim;

                    if (camera.isPerspectiveCamera) {
                        // Move camera closer along its current direction vector
                        const dir = new THREE.Vector3().subVectors(camera.position, controls ? controls.target : targetPos).normalize();
                        const currentDistance = camera.position.distanceTo(controls ? controls.target : targetPos);
                        const newDistance = currentDistance / zoomRatio;

                        camera.position.copy(targetPos).add(dir.multiplyScalar(newDistance));
                    } else if (camera.isOrthographicCamera) {
                        camera.zoom *= zoomRatio;
                        camera.updateProjectionMatrix();
                        camera.position.set(targetPos.x, targetPos.y, targetPos.z);
                    }

                    if (controls) {
                        controls.target.copy(targetPos);
                        controls.update();
                    }
                }
            }

            setStartPoint(null);
            setCurrentPoint(null);
            setActiveTool('select'); // Reset to select tool after zooming
        };

        const canvas = gl.domElement;
        canvas.addEventListener('pointerdown', handlePointerDown);
        canvas.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp); // Use window to catch release outside canvas

        return () => {
            canvas.removeEventListener('pointerdown', handlePointerDown);
            canvas.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            if (controls) controls.enabled = true;
        };
    }, [activeTool, camera, gl, scene, controls, setActiveTool]);

    if (!startPoint || !currentPoint) return null;

    // Render 2D Marquee Box overlay (in screen space) using HTML or DOM overlay
    const left = Math.min(startPoint.x, currentPoint.x);
    const top = Math.min(startPoint.y, currentPoint.y);
    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            pointerEvents: 'none',
            zIndex: 100000
        }}>
            <div style={{
                position: 'fixed',
                left, top, width, height,
                border: '2px dashed #38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.2)',
                boxSizing: 'border-box'
            }} />
        </div>
    );
};