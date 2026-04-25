import React, { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useSketchStore } from './SketcherStore';
import { Canvas } from '@react-three/fiber';
import { OrthographicCamera, PerspectiveCamera, OrbitControls, Grid } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MousePointer2, PenTool, Triangle, Axis3D, DownloadCloud, UploadCloud, Trash2, Focus, EyeOff, Eye, Type, ZoomIn, ZoomOut, ArrowRight } from 'lucide-react';
import NodeEditorPanel from './NodeEditorPanel';
import SketcherAnnotations from './SketcherAnnotations';
import MarqueeSelection from './MarqueeSelection';
import { DynamicGrid } from './DynamicGrid';
import { DraggableNode } from './DraggableNode';
import { canonicalToSimplified2D } from '../core/geometry/adapters/canonicalToSimplified2D';

const SketcherToolbar = () => {
    const { activeTool, setActiveTool, workingPlane, setWorkingPlane, importFromComponents, importFromCanonicalGeometry, exportToComponents, exportToCanonicalGeometry, clearSketch } = useSketchStore();
    const appComponents = useAppStore(s => s.components);
    const canonicalGeometry = useAppStore(s => s.activeCanonicalGeometry || s.canonicalGeometry);
    const setAppComponents = useAppStore(s => s.setComponents);
    const setSketcherGeometry = useAppStore(s => s.setSketcherGeometry);
    const setActiveCanonicalGeometry = useAppStore(s => s.setActiveCanonicalGeometry);
    const setSimplifiedGeometry = useAppStore(s => s.setSimplifiedGeometry);
    const setAnalysisPayload = useAppStore(s => s.setAnalysisPayload);
    const setActiveTab = useAppStore(s => s.setActiveTab);

    const handleImport = () => {
        if (canonicalGeometry?.segments?.length) {
            importFromCanonicalGeometry(canonicalGeometry);
            return;
        }
        if (appComponents.length === 0) {
            alert("No geometry in 3D Viewer to import.");
            return;
        }
        importFromComponents(appComponents);
    };

    const handleSync = () => {
        const canonical = exportToCanonicalGeometry();
        const newComps = exportToComponents();
        if (newComps.length > 0 || canonical.segments.length > 0) {
            setSketcherGeometry(canonical);
            setActiveCanonicalGeometry(canonical);
            if (newComps.length > 0) setAppComponents(newComps);
            alert("Successfully synchronized Sketcher graph to canonical geometry and 3D Viewer!");
            setActiveTab('viewer');
        } else {
            alert("Graph is empty, nothing to sync.");
        }
    };

    const handleAnalyze2D = () => {
        const canonical = exportToCanonicalGeometry();
        if (!canonical.segments.length) {
            alert("Graph is empty, nothing to analyze.");
            return;
        }
        const simplifiedPayload = canonicalToSimplified2D(canonical, { source: 'sketcher', plane: workingPlane });
        setSketcherGeometry(canonical);
        setActiveCanonicalGeometry(canonical);
        setSimplifiedGeometry(simplifiedPayload);
        setAnalysisPayload(simplifiedPayload);
        setActiveTab('simpAnalysis');
    };

    const btnStyle = (active) => ({
        padding: '8px 12px',
        background: active ? '#3b82f6' : '#1e293b',
        color: active ? '#fff' : '#cbd5e1',
        border: '1px solid #334155',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '8px',
        width: '100%'
    });

    return (
        <div style={{ width: '160px', background: '#0f172a', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column', padding: '8px', gap: '8px', alignItems: 'flex-start' }}>
            <button title="Select / Edit" style={btnStyle(activeTool === 'select')} onClick={() => setActiveTool('select')}>
                <MousePointer2 size={18} />
                <span style={{ fontSize: '12px' }}>Select / Edit</span>
            </button>
            <button title="Draw Pipe" style={btnStyle(activeTool === 'draw_pipe')} onClick={() => setActiveTool('draw_pipe')}>
                <PenTool size={18} />
                <span style={{ fontSize: '12px' }}>Draw Pipe</span>
            </button>
            <button title="Place Anchor" style={btnStyle(activeTool === 'add_node')} onClick={() => setActiveTool('add_node')}>
                <Triangle size={18} />
                <span style={{ fontSize: '12px' }}>Place Anchor</span>
            </button>
            
            <div style={{ height: '1px', background: '#334155', width: '100%', margin: '4px 0' }} />
            
            <button title="Working Plane" style={btnStyle(false)} onClick={() => {
                let next = 'XY';
                if (workingPlane === 'XY') next = 'XZ';
                else if (workingPlane === 'XZ') next = 'YZ';
                setWorkingPlane(next);
            }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Plane: {workingPlane}</span>
            </button>

            <div style={{ height: '1px', background: '#334155', width: '100%', margin: '4px 0' }} />

            {/* View & Annotation Toggles */}
            <div style={{ display: 'flex', gap: '4px', width: '100%', flexDirection: 'column' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Annotations</span>

                <button title="Toggle Node Labels" style={btnStyle(useSketchStore(s => s.showNodeLabels))} onClick={() => useSketchStore.getState().toggleNodeLabels()}>
                    {useSketchStore(s => s.showNodeLabels) ? <Eye size={14} /> : <EyeOff size={14} color="#94a3b8" />}
                    <span style={{ fontSize: '10px' }}>Nodes</span>
                </button>

                <button title="Toggle Length Labels" style={btnStyle(useSketchStore(s => s.showLengthLabels))} onClick={() => useSketchStore.getState().toggleLengthLabels()}>
                    {useSketchStore(s => s.showLengthLabels) ? <Eye size={14} /> : <EyeOff size={14} color="#94a3b8" />}
                    <span style={{ fontSize: '10px' }}>Lengths</span>
                </button>

                <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    <button title="Increase Font Size" style={{ ...btnStyle(false), flex: 1, padding: '4px', justifyContent: 'center' }} onClick={() => useSketchStore.getState().setAnnotationScale(useSketchStore.getState().annotationScale * 1.2)}>
                        <Type size={14} /> <ZoomIn size={12} />
                    </button>
                    <button title="Decrease Font Size" style={{ ...btnStyle(false), flex: 1, padding: '4px', justifyContent: 'center' }} onClick={() => useSketchStore.getState().setAnnotationScale(useSketchStore.getState().annotationScale / 1.2)}>
                        <Type size={14} /> <ZoomOut size={12} />
                    </button>
                </div>
            </div>

            <div style={{ flex: 1 }} />

            <button title="Auto Center" style={btnStyle(false)} onClick={() => {
                useSketchStore.getState().triggerAutoCenter();
            }}>
                <Focus size={18} color="#f59e0b" />
                <span style={{ fontSize: '12px' }}>Auto Center</span>
            </button>

            <button title="Clear Sketch" style={btnStyle(false)} onClick={() => { if(window.confirm('Clear sketch?')) clearSketch(); }}>
                <Trash2 size={18} color="#ef4444" />
                <span style={{ fontSize: '12px' }}>Clear</span>
            </button>
            <button title="Pull from 3D Viewer" style={btnStyle(false)} onClick={handleImport}>
                <DownloadCloud size={18} color="#10b981" />
                <span style={{ fontSize: '12px' }}>Import 3D</span>
            </button>
            <button title="Send Sketcher graph to Simplified 2D" style={btnStyle(false)} onClick={handleAnalyze2D}>
                <ArrowRight size={18} color="#f59e0b" />
                <span style={{ fontSize: '12px' }}>Analyze 2D</span>
            </button>
            <button title="Sync to 3D Viewer" style={btnStyle(false)} onClick={handleSync}>
                <UploadCloud size={18} color="#3b82f6" />
                <span style={{ fontSize: '12px' }}>Sync 3D</span>
            </button>
        </div>
    );
};

// Interactive Plane for catching clicks in 2D View
const InteractivePlane = ({ isAltHeld }) => {
    const { activeTool, workingPlane, setDraftingState, draftingState, createNode, createSegment, resolve3DPoint, snapNodeId, nodes } = useSketchStore();
    
    // Adjust invisible plane rotation and position based on working plane and Alt state
    let rotation = [0, 0, 0];
    let position = [0, 0, 0];
    const isDrawingAndAlt = draftingState.isDrawing && isAltHeld && draftingState.startNodeId && nodes[draftingState.startNodeId];

    // DO NOT rotate the plane when Alt is held.
    // The OrthographicCamera rays are parallel to the depth axis.
    // Rotating the plane 90 degrees makes it edge-on, meaning the rays never intersect it.
    // We must keep the plane facing the camera, and map the mouse's in-plane movement to the depth axis instead.

    // Standard in-plane rotations
    if (workingPlane === 'XZ') rotation = [-Math.PI/2, 0, 0];
    if (workingPlane === 'YZ') rotation = [0, Math.PI/2, 0];

    const handlePointerMove = (e) => {
        if (draftingState.isDrawing) {
            let targetPoint = e.point;

            if (isDrawingAndAlt) {
                 // Alt Key Out-of-Plane Locking
                 // Since the plane is NOT rotated, e.point gives us movement in the current viewing plane.
                 // We take the cursor's movement in the screen Y axis (or X axis depending on the view)
                 // and apply that exact distance to the depth axis instead.
                 const startVec = new THREE.Vector3(...nodes[draftingState.startNodeId].pos);

                 if (workingPlane === 'XY') {
                     // Use the cursor's Y position in the XY plane to dictate Z depth
                     // e.point.y - startVec.y gives us the drag distance.
                     targetPoint = new THREE.Vector3(startVec.x, startVec.y, startVec.z + (e.point.y - startVec.y));
                 } else if (workingPlane === 'XZ') {
                     // Cursor's Z position (which maps to screen Y in the top-down XZ view) dictates Y height
                     targetPoint = new THREE.Vector3(startVec.x, startVec.y + (e.point.z - startVec.z), startVec.z);
                 } else if (workingPlane === 'YZ') {
                     // Cursor's Z position dictates X depth
                     targetPoint = new THREE.Vector3(startVec.x + (e.point.z - startVec.z), startVec.y, startVec.z);
                 }
            } else if (e.shiftKey && draftingState.startNodeId && nodes[draftingState.startNodeId]) {
                 // Orthogonal locking with Shift key
                const startPos = nodes[draftingState.startNodeId].pos;
                // e.point is natively mapped to the rotated plane.
                // Depending on the working plane, we align the moving point to the X or Y of the e.point,
                // but we map back to the global coordinate depending on which axis the difference is greater.
                // e.point represents intersection on the Three.js global axis.
                const startVec = new THREE.Vector3(...startPos);

                const diffX = Math.abs(e.point.x - startVec.x);
                const diffY = Math.abs(e.point.y - startVec.y);
                const diffZ = Math.abs(e.point.z - startVec.z);

                if (workingPlane === 'XY') {
                    targetPoint = diffX > diffY
                        ? new THREE.Vector3(e.point.x, startVec.y, startVec.z)
                        : new THREE.Vector3(startVec.x, e.point.y, startVec.z);
                } else if (workingPlane === 'XZ') {
                    targetPoint = diffX > diffZ
                        ? new THREE.Vector3(e.point.x, startVec.y, startVec.z)
                        : new THREE.Vector3(startVec.x, startVec.y, e.point.z);
                } else if (workingPlane === 'YZ') {
                    targetPoint = diffY > diffZ
                        ? new THREE.Vector3(startVec.x, e.point.y, startVec.z)
                        : new THREE.Vector3(startVec.x, startVec.y, e.point.z);
                }
            }

            // If snapped, use the exact node position for phantom visual, else use plane pos
            if (snapNodeId && nodes[snapNodeId] && !e.shiftKey) { // OSNAP overrides shift lock ideally, or shift disables osnap. Let's say OSNAP takes precedence if close, but shift disables it here.
                const n = nodes[snapNodeId];
                setDraftingState({ currentPos: new THREE.Vector3(...n.pos) });
            } else {
                setDraftingState({ currentPos: targetPoint });
            }
        }
    };

    const handleClick = (e) => {
        e.stopPropagation();
        useSketchStore.getState().handleInteractionClick(e.point, snapNodeId, e.shiftKey, isAltHeld);
    };

    // Right click or Escape to cancel drawing
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && draftingState.isDrawing) {
                setDraftingState({ isDrawing: false, startNodeId: null, currentPos: null });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [draftingState.isDrawing, setDraftingState]);

    return (
        <mesh 
            position={position}
            rotation={rotation} 
            visible={false} 
            onPointerMove={handlePointerMove}
            onClick={handleClick}
            onContextMenu={(e) => {
                e.stopPropagation();
                if (draftingState.isDrawing) {
                    setDraftingState({ isDrawing: false, startNodeId: null, currentPos: null });
                }
            }}
        >
            <planeGeometry args={[100000, 100000]} />
            <meshBasicMaterial side={THREE.DoubleSide} />
        </mesh>
    );
};

// AutoCenter bounds for the 3D Verification View
// AutoCenter bounds for the 2D View
const MainViewAutoCenter = ({ isAltHeld }) => {
    const { camera, controls } = useThree();
    const nodes = useSketchStore(s => s.nodes);
    const autoCenterTrigger = useSketchStore(s => s.autoCenterTrigger);
    const workingPlane = useSketchStore(s => s.workingPlane);

    // Auto-centering effect
    useEffect(() => {
        if (autoCenterTrigger === 0) return;

        const nodeValues = Object.values(nodes);
        if (nodeValues.length === 0) {
            camera.position.set(0, 0, 10000);
            Object.assign(camera, { zoom: 0.2 });
            camera.updateProjectionMatrix();
            if (controls) {
                controls.target.set(0,0,0);
                controls.update();
            }
            return;
        }

        const box = new THREE.Box3();
        nodeValues.forEach(n => {
            box.expandByPoint(new THREE.Vector3(...n.pos));
        });

        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Find maximum dimension
        const maxDim = Math.max(size.x, size.y, size.z);
        const safeMaxDim = maxDim === 0 ? 1000 : maxDim;

        // Base orthographic alignment
        if (workingPlane === 'XY') {
            camera.position.set(center.x, center.y, 10000);
            if (controls) controls.target.copy(center);
        } else if (workingPlane === 'XZ') {
            camera.position.set(center.x, 10000, center.z);
            if (controls) controls.target.copy(center);
        } else {
            camera.position.set(10000, center.y, center.z);
            if (controls) controls.target.copy(center);
        }

        // Orthographic camera view size adjustment
        const targetZoom = Math.min(window.innerWidth, window.innerHeight) / (safeMaxDim * 1.5);
        Object.assign(camera, { zoom: targetZoom });
        camera.updateProjectionMatrix();

        if (controls) {
            controls.update();
        }

    }, [autoCenterTrigger, nodes, camera, controls, isAltHeld]);

    return null;
};


const VerificationViewBounds = () => {
    const { camera, controls } = useThree();
    const nodes = useSketchStore(s => s.nodes);
    
    useEffect(() => {
        const nodeValues = Object.values(nodes);
        if (nodeValues.length === 0) return;

        const box = new THREE.Box3();
        nodeValues.forEach(n => {
            box.expandByPoint(new THREE.Vector3(...n.pos));
        });

        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const safeMaxDim = maxDim === 0 ? 1000 : maxDim;

        const fov = camera.fov * (Math.PI / 180);
        const boundingSphereRadius = (safeMaxDim / 2) * Math.sqrt(3);
        let targetDistance = (boundingSphereRadius * 1.2) / Math.sin(fov / 2);
        targetDistance = Math.max(targetDistance, 1000); 

        const offset = Math.sqrt((targetDistance * targetDistance) / 3);
        camera.position.set(center.x + offset, center.y + offset, center.z + offset);
        
        // React Three Fiber mutates the camera naturally. We bypass strict read-only lint checks.
        Object.assign(camera, { near: 1, far: targetDistance * 100 });
        camera.updateProjectionMatrix();

        if (controls) {
            controls.target.copy(center);
            controls.update();
        }
    }, [nodes, camera, controls]);

    return null;
};

// Abstract rendering of the graph
const GraphRenderer = ({ is3D }) => {
    const nodes = useSketchStore(s => s.nodes);
    const segments = useSketchStore(s => s.segments);
    const draftingState = useSketchStore(s => s.draftingState);

    return (
        <group>
            {Object.entries(nodes).map(([id, node]) => (
                <DraggableNode key={id} id={id} node={node} is3D={is3D} />
            ))}
            {segments.map(seg => {
                const n1 = nodes[seg.startNode];
                const n2 = nodes[seg.endNode];
                if (!n1 || !n2) return null;
                
                const startVec = new THREE.Vector3(...n1.pos);
                const endVec = new THREE.Vector3(...n2.pos);
                const diff = endVec.clone().sub(startVec);
                const length = diff.length();
                if (length < 1) return null; // prevent zero-length errors
                
                const mid = startVec.clone().add(diff.clone().multiplyScalar(0.5));
                const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), diff.normalize());

                const isSelected = useSketchStore.getState().selectedItems.segments.includes(seg.id);

                return (
                    <mesh key={seg.id} position={mid} quaternion={quaternion}>
                        <cylinderGeometry args={[is3D ? (seg.properties?.bore || 100)/2 : 40, is3D ? (seg.properties?.bore || 100)/2 : 40, length, 8]} />
                        <meshBasicMaterial color={isSelected ? '#38bdf8' : (seg.properties?.type === 'FITTING_LEG' ? '#32cd32' : '#94a3b8')} />
                    </mesh>
                );
            })}
            
            <SketcherAnnotations is3D={is3D} />

            {/* Phantom Drawing Segment */}
            {!is3D && draftingState.isDrawing && draftingState.startNodeId && draftingState.currentPos && (
                <PhantomSegment startPos={nodes[draftingState.startNodeId].pos} endPos={useSketchStore.getState().resolve3DPoint(draftingState.currentPos)} />
            )}
        </group>
    );
};

const PhantomSegment = ({ startPos, endPos }) => {
    const startVec = new THREE.Vector3(...startPos);
    const endVec = new THREE.Vector3(...endPos);
    const diff = endVec.clone().sub(startVec);
    const length = diff.length();
    if (length < 1) return null;

    const mid = startVec.clone().add(diff.clone().multiplyScalar(0.5));
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), diff.normalize());

    return (
        <mesh position={mid} quaternion={quaternion}>
            <cylinderGeometry args={[40, 40, length, 8]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} />
        </mesh>
    );
};

export const SketcherTab = () => {
    const workingPlane = useSketchStore(s => s.workingPlane);
    const activeTool = useSketchStore(s => s.activeTool);
    const importWarnings = useSketchStore(s => s.importWarnings);
    const clearWarnings = useSketchStore(s => s.clearWarnings);

    const [isAltHeld, setIsAltHeld] = React.useState(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Alt') {
                e.preventDefault(); // prevent browser menu stealing
                setIsAltHeld(true);
            }
        };
        const handleKeyUp = (e) => {
            if (e.key === 'Alt') {
                e.preventDefault();
                setIsAltHeld(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Also clear if window loses focus
        const handleBlur = () => setIsAltHeld(false);
        window.addEventListener('blur', handleBlur);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'row', height: 'calc(100vh - 48px)', background: '#0f172a' }}>
            <SketcherToolbar />

            {/* Main 2D Canvas */}
            <div style={{ flex: 1, position: 'relative' }}>
                {/* Mode Indicator */}
                <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, background: 'rgba(15, 23, 42, 0.8)', padding: '6px 12px', borderRadius: '4px', border: '1px solid #334155', color: '#f8fafc', fontSize: '14px', fontWeight: 'bold' }}>
                    2D Orthographic Mode: {workingPlane} Plane | Tool: {activeTool.replace('_', ' ').toUpperCase()}
                </div>

                {/* Import Warnings UI Toast */}
                {importWarnings.length > 0 && (
                    <div style={{ position: 'absolute', top: 60, left: 16, zIndex: 10, background: 'rgba(239, 68, 68, 0.8)', padding: '6px 12px', borderRadius: '4px', border: '1px solid #991b1b', color: '#fef2f2', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => clearWarnings()}>
                        Import Warnings: {importWarnings.length} components skipped (Click to clear)
                    </div>
                )}

                <NodeEditorPanel />

                <Canvas style={{ cursor: activeTool !== 'select' ? 'crosshair' : 'default' }}>
                    <MarqueeSelection />
                    <OrthographicCamera 
                        makeDefault 
                        position={workingPlane === 'XY' ? [0, 0, 10000] : (workingPlane === 'XZ' ? [0, 10000, 0] : [10000, 0, 0])} 
                        zoom={0.2} 
                        near={-100000} far={100000} 
                    />
                    <OrbitControls makeDefault enableRotate={false} />
                    <MainViewAutoCenter isAltHeld={isAltHeld} />
                    <DynamicGrid workingPlane={workingPlane} />
                    <InteractivePlane isAltHeld={isAltHeld} />
                    <GraphRenderer is3D={false} />
                </Canvas>

                {/* PiP 3D Container (Top Right) */}
                <div style={{ 
                    position: 'absolute', top: 16, right: 16, width: '300px', height: '300px', 
                    background: '#1e293b', border: '2px solid #3b82f6', borderRadius: '8px', 
                    overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' 
                }}>
                    <div style={{ position: 'absolute', top: 4, left: 8, zIndex: 10, color: '#38bdf8', fontSize: '10px', fontWeight: 'bold', textShadow: '1px 1px 2px black' }}>3D VERIFICATION VIEW</div>
                    <Canvas>
                        <PerspectiveCamera makeDefault position={[5000, 5000, 5000]} fov={50} />
                        <OrbitControls makeDefault />
                        <ambientLight intensity={0.5} />
                        <directionalLight position={[10, 10, 5]} intensity={1} />
                        <VerificationViewBounds />
                        <GraphRenderer is3D={true} />
                    </Canvas>
                </div>
            </div>
        </div>
    );
};

export default SketcherTab;
