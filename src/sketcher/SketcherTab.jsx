import React, { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useSketchStore } from './SketcherStore';
import { Canvas } from '@react-three/fiber';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { OrthographicCamera, PerspectiveCamera, OrbitControls, Grid } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MousePointer2, PenTool, Triangle, Axis3D, DownloadCloud, UploadCloud, Trash2, Focus, EyeOff, Eye, Type, ZoomIn, ZoomOut, ArrowRight, Save, FolderOpen, FileJson, Repeat } from 'lucide-react';
import NodeEditorPanel from './NodeEditorPanel';
import SegmentEditorPanel from './SegmentEditorPanel';
import SketcherAnnotations from './SketcherAnnotations';
import MarqueeSelection from './MarqueeSelection';
import { DynamicGrid } from './DynamicGrid';
import { DraggableNode } from './DraggableNode';
import { canonicalToSimplified2D } from '../core/geometry/adapters/canonicalToSimplified2D';
import { useAnalysisStore } from '../3d-analysis';
import { Activity } from 'lucide-react';
import TopologyDiagnosticsPanel from './TopologyDiagnosticsPanel';

const SketcherToolbar = () => {
    const {
    activeTool,
    setActiveTool,
    workingPlane,
    setWorkingPlane,
    importFromComponents,
    importFromCanonicalGeometry,
    exportToComponents,
    exportToCanonicalGeometry,
    clearSketch,
    exportSketch,
    importSketch,
    selectedSegmentId,
    applyMasterDbComponentToSegment,
    splitInsertMasterDbComponentIntoSegment,
    componentPlacementRatio,
    setComponentPlacementRatio,
} = useSketchStore();
    const appComponents = useAppStore(s => s.components);
    const canonicalGeometry = useAppStore(s => s.activeCanonicalGeometry || s.canonicalGeometry);
    const setAppComponents = useAppStore(s => s.setComponents);
    const setSketcherGeometry = useAppStore(s => s.setSketcherGeometry);
    const setActiveCanonicalGeometry = useAppStore(s => s.setActiveCanonicalGeometry);
    const setSimplifiedGeometry = useAppStore(s => s.setSimplifiedGeometry);
    const setAnalysisPayload = useAppStore(s => s.setAnalysisPayload);
    const setActiveTab = useAppStore(s => s.setActiveTab);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (window.__SIMPLIFIED_ANALYSIS_E2E__) {
            window.__SIMPLIFIED_ANALYSIS_SKETCHER_STORE__ = useSketchStore;
        }

        return () => {
            if (window.__SIMPLIFIED_ANALYSIS_E2E__) {
                delete window.__SIMPLIFIED_ANALYSIS_SKETCHER_STORE__;
            }
        };
    }, []);

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


    const handlePushTo3DSimplified = () => {
        const { nodes, segments, designTemperature } = useSketchStore.getState();

        if (Object.keys(nodes || {}).length === 0 || !segments?.length) {
            alert('Sketch is empty — draw at least one pipe segment before pushing.');
            return;
        }

        useAnalysisStore.getState().importFromSketcher(nodes, segments, { designTemperature });
        setActiveTab('3d-analysis');
    };

    const handleInsertMasterComponent = (masterDbRowId) => {
        if (!selectedSegmentId) {
            alert('Select a pipe segment before inserting a component.');
            return;
        }

        const result = applyMasterDbComponentToSegment(selectedSegmentId, masterDbRowId);

        if (!result?.ok) {
            alert(result?.diagnostic?.message || 'Failed to insert component from Master DB.');
        }
    };

    const handlePlaceMasterComponent = (masterDbRowId) => {
        if (!selectedSegmentId) {
            alert('Select a pipe segment before placing a component.');
            return;
        }

        const result = splitInsertMasterDbComponentIntoSegment(selectedSegmentId, masterDbRowId, {
            placementRatio: componentPlacementRatio / 100,
            minimumPipeStub_mm: 1,
        });

        if (!result?.ok) {
            alert(result?.diagnostic?.message || 'Failed to place component from Master DB.');
        }
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

            <div style={{ height: '1px', background: '#334155', width: '100%', margin: '4px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Global Settings</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Design Temp (°F)</span>
                    <input 
                        type="number" step="10"
                        style={{ width: '60px', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '4px', borderRadius: '4px', fontSize: '11px' }}
                        value={useSketchStore(s => s.designTemperature)}
                        onChange={(e) => useSketchStore.getState().setDesignTemperature(Number(e.target.value))}
                    />
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
            <button title="Save Sketch to JSON" style={btnStyle(false)} onClick={() => exportSketch()}>
                <Save size={18} color="#38bdf8" />
                <span style={{ fontSize: '12px' }}>Save Sketch</span>
            </button>
            <label title="Load Sketch from JSON" style={{ ...btnStyle(false), cursor: 'pointer' }}>
                <FolderOpen size={18} color="#a78bfa" />
                <span style={{ fontSize: '12px' }}>Load Sketch</span>
                <input type="file" accept=".json" style={{ display: 'none' }} onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => importSketch(evt.target.result);
                    reader.readAsText(file);
                    e.target.value = '';
                }} />
            </label>
            <button title="Pull from 3D Viewer" style={btnStyle(false)} onClick={handleImport}>
                <DownloadCloud size={18} color="#10b981" />
                <span style={{ fontSize: '12px' }}>Import 3D</span>
            </button>
            <button title="Send Sketcher graph to Simplified 2D" style={btnStyle(false)} onClick={handleAnalyze2D}>
                <ArrowRight size={18} color="#f59e0b" />
                <span style={{ fontSize: '12px' }}>Analyze 2D</span>
            </button>
            <button
                data-testid="sketcher-push-to-3d-simplified"
                title="Push sketch to 3D Simplified Calculation"
                style={btnStyle(false)}
                onClick={handlePushTo3DSimplified}
            >
                <Activity size={18} color="#38bdf8" />
                <span style={{ fontSize: '12px' }}>Push 3D Calc</span>
            </button>
            <div style={{ height: '1px', background: '#334155', width: '100%', margin: '4px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>
                    Insert Component
                </span>

                <button
                    data-testid="sketcher-insert-component-valve"
                    title="Insert valve data from Master DB onto selected segment"
                    style={{ ...btnStyle(false), fontSize: '11px' }}
                    onClick={() => handleInsertMasterComponent('MDB-VALVE-4IN-150-CS-001')}
                >
                    Insert Valve
                </button>

                <button
                    data-testid="sketcher-insert-component-flange"
                    title="Insert flange data from Master DB onto selected segment"
                    style={{ ...btnStyle(false), fontSize: '11px' }}
                    onClick={() => handleInsertMasterComponent('MDB-FLANGE-4IN-150-CS-001')}
                >
                    Insert Flange
                </button>

                <button
                    data-testid="sketcher-insert-component-vfv"
                    title="Insert flange-valve-flange assembly data from Master DB onto selected segment"
                    style={{ ...btnStyle(false), fontSize: '11px' }}
                    onClick={() => handleInsertMasterComponent('MDB-VFV-4IN-150-CS-001')}
                >
                    Insert F-V-F
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '4px', marginTop: '4px' }}>
                    <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>
                        Place / Split
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Component position %</span>
                        <input
                            data-testid="sketcher-component-placement-ratio"
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={componentPlacementRatio}
                            onChange={(e) => setComponentPlacementRatio(Number(e.target.value))}
                            style={{
                                width: '40px',
                                background: '#0f172a',
                                border: '1px solid #334155',
                                color: '#fff',
                                padding: '2px 4px',
                                fontSize: '11px',
                                borderRadius: '4px',
                            }}
                        />
                    </div>

                    <button
                        data-testid="sketcher-place-component-valve"
                        title="Split selected pipe and place valve from Master DB"
                        style={{ ...btnStyle(false), fontSize: '11px' }}
                        onClick={() => handlePlaceMasterComponent('MDB-VALVE-4IN-150-CS-001')}
                    >
                        Place Valve
                    </button>

                    <button
                        data-testid="sketcher-place-component-flange"
                        title="Split selected pipe and place flange from Master DB"
                        style={{ ...btnStyle(false), fontSize: '11px' }}
                        onClick={() => handlePlaceMasterComponent('MDB-FLANGE-4IN-150-CS-001')}
                    >
                        Place Flange
                    </button>

                    <button
                        data-testid="sketcher-place-component-vfv"
                        title="Split selected pipe and place flange-valve-flange assembly from Master DB"
                        style={{ ...btnStyle(false), fontSize: '11px' }}
                        onClick={() => handlePlaceMasterComponent('MDB-VFV-4IN-150-CS-001')}
                    >
                        Place F-V-F
                    </button>
                </div>
            </div>
            <button title="Sync to 3D Viewer" style={btnStyle(false)} onClick={handleSync}>
                <UploadCloud size={18} color="#3b82f6" />
                <span style={{ fontSize: '12px' }}>Sync 3D</span>
            </button>

            <div style={{ height: '1px', background: '#334155', width: '100%', margin: '4px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Drafting Commands</span>
                <button data-testid="sketcher-convert-bend" title="Convert to Bend" style={{ ...btnStyle(false), fontSize: '11px' }} onClick={() => useSketchStore.getState().convertSelectedToBend()}>
                    Convert Bend
                </button>
                <button data-testid="sketcher-convert-tee" title="Convert to Tee" style={{ ...btnStyle(false), fontSize: '11px' }} onClick={() => useSketchStore.getState().convertSelectedToTee()}>
                    Convert Tee
                </button>
                <button data-testid="sketcher-convert-olet" title="Convert to Olet" style={{ ...btnStyle(false), fontSize: '11px' }} onClick={() => useSketchStore.getState().convertSelectedToOlet()}>
                    Convert Olet
                </button>
                <button data-testid="sketcher-auto-connect" title="Auto Connect" style={{ ...btnStyle(false), fontSize: '11px' }} onClick={() => useSketchStore.getState().autoConnectPipes()}>
                    Auto Connect
                </button>
                <button data-testid="sketcher-validate-topology" title="Validate Topology" style={{ ...btnStyle(false), fontSize: '11px' }} onClick={() => useSketchStore.getState().validateTopology()}>
                    Validate
                </button>
            </div>

            <div style={{ height: '1px', background: '#334155', width: '100%', margin: '4px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>PCFX Import/Export</span>
                <button data-testid="sketcher-export-pcfx" title="Export PCFX" style={{ ...btnStyle(false), fontSize: '11px' }} onClick={() => useSketchStore.getState().exportToPCFXFile()}>
                    <FileJson size={14} />
                    Export PCFX
                </button>
                <button data-testid="sketcher-import-pcfx" title="Import PCFX" style={{ ...btnStyle(false), fontSize: '11px' }} onClick={() => document.getElementById('pcfx-file-input')?.click()}>
                    <FileJson size={14} />
                    Import PCFX
                </button>
                <input id="pcfx-file-input" data-testid="sketcher-import-pcfx-input" type="file" accept=".json,.pcfx,.pcfx.json,application/json" style={{display:'none'}} onChange={async (e) => { const file = e.target.files?.[0]; if (file) { const text = await file.text(); useSketchStore.getState().importFromPCFXText(text); e.target.value = ''; } }} />
                <button data-testid="sketcher-roundtrip-pcfx" title="Roundtrip Check" style={{ ...btnStyle(false), fontSize: '11px' }} onClick={() => useSketchStore.getState().runPCFXRoundtripCheck()}>
                    <Repeat size={14} />
                    Roundtrip Check
                </button>
            </div>
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

// ── Elbow Fitting ─────────────────────────────────────────────────────
// Rendered at a node where exactly 2 segments meet (or node.type === 'elbow').
// Shows: body sphere + two directional stubs + a torus ring in the bend plane.
const ElbowFitting = ({ nodePos, dirs, pipeR, isSelected }) => {
    const bodyColor  = isSelected ? '#f59e0b' : '#7c3aed';  // violet
    const stubColor  = isSelected ? '#fbbf24' : '#8b5cf6';
    const torusColor = isSelected ? '#fde68a' : '#a78bfa';
    const stubLen    = pipeR * 3.5;

    // Torus in the plane of the bend
    const d1 = dirs[0], d2 = dirs[1];
    const bendNormal = d1.clone().cross(d2);
    const bnLen = bendNormal.length();
    const torusQ = bnLen > 0.001
        ? new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), bendNormal.normalize())
        : new THREE.Quaternion();

    return (
        <group position={nodePos}>
            {/* Body sphere at the vertex */}
            <mesh>
                <sphereGeometry args={[pipeR * 2.0, 20, 20]} />
                <meshBasicMaterial color={bodyColor} />
            </mesh>

            {/* Torus ring in the bend plane */}
            {bnLen > 0.001 && (
                <mesh quaternion={torusQ}>
                    <torusGeometry args={[pipeR * 1.5, pipeR * 0.35, 10, 32]} />
                    <meshBasicMaterial color={torusColor} />
                </mesh>
            )}

            {/* Two directional stubs */}
            {dirs.map((dir, i) => {
                const midOff = dir.clone().multiplyScalar(stubLen / 2);
                const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
                return (
                    <mesh key={i} position={midOff.toArray()} quaternion={q}>
                        <cylinderGeometry args={[pipeR, pipeR, stubLen, 12]} />
                        <meshBasicMaterial color={stubColor} />
                    </mesh>
                );
            })}
        </group>
    );
};

// ── Tee Fitting ────────────────────────────────────────────────────────
// Rendered at a node where exactly 3 segments meet (or node.type === 'tee').
// Shows: body sphere + three directional stubs + equatorial disc.
const TeeFitting = ({ nodePos, dirs, pipeR, isSelected }) => {
    const bodyColor = isSelected ? '#f59e0b' : '#065f46';   // dark green
    const stubColor = isSelected ? '#fbbf24' : '#10b981';
    const ringColor = isSelected ? '#fde68a' : '#34d399';
    const stubLen   = pipeR * 3.0;

    // Ring disc — try to orient it flat in the dominant plane of the 3 connections
    const avg = dirs.reduce((acc, d) => acc.clone().add(d), new THREE.Vector3()).normalize();
    const discQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), avg.length() > 0.001 ? avg : new THREE.Vector3(0, 1, 0));

    return (
        <group position={nodePos}>
            {/* Body sphere */}
            <mesh>
                <sphereGeometry args={[pipeR * 2.4, 20, 20]} />
                <meshBasicMaterial color={bodyColor} />
            </mesh>

            {/* Equatorial ring disc */}
            <mesh quaternion={discQ}>
                <torusGeometry args={[pipeR * 2.0, pipeR * 0.3, 8, 36]} />
                <meshBasicMaterial color={ringColor} />
            </mesh>

            {/* Three directional stubs */}
            {dirs.map((dir, i) => {
                const midOff = dir.clone().multiplyScalar(stubLen / 2);
                const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
                return (
                    <mesh key={i} position={midOff.toArray()} quaternion={q}>
                        <cylinderGeometry args={[pipeR, pipeR, stubLen, 12]} />
                        <meshBasicMaterial color={stubColor} />
                    </mesh>
                );
            })}
        </group>
    );
};

// ── GraphRenderer ──────────────────────────────────────────────────────
const GraphRenderer = ({ is3D }) => {
    const nodes = useSketchStore(s => s.nodes);
    const segments = useSketchStore(s => s.segments);
    const draftingState = useSketchStore(s => s.draftingState);
    const activeTool = useSketchStore(s => s.activeTool);
    const selectedSegmentId = useSketchStore(s => s.selectedSegmentId);
    const setSelectedSegmentId = useSketchStore(s => s.setSelectedSegmentId);
    const selectedNodeId = useSketchStore(s => s.selectedNodeId);

    // Build node → connected segments map
    const nodeConnections = {};
    segments.forEach(seg => {
        if (!nodeConnections[seg.startNode]) nodeConnections[seg.startNode] = [];
        if (!nodeConnections[seg.endNode])   nodeConnections[seg.endNode]   = [];
        nodeConnections[seg.startNode].push({ seg, isStart: true });
        nodeConnections[seg.endNode].push({ seg, isStart: false });
    });

    return (
        <group>
            {/* ── Draggable interaction nodes ── */}
            {Object.entries(nodes).map(([id, node]) => (
                <DraggableNode key={id} id={id} node={node} is3D={is3D} />
            ))}

            {/* ── Pipe segments ── */}
            {segments.map(seg => {
                const n1 = nodes[seg.startNode];
                const n2 = nodes[seg.endNode];
                if (!n1 || !n2) return null;

                const startVec = new THREE.Vector3(...n1.pos);
                const endVec   = new THREE.Vector3(...n2.pos);
                const diff     = endVec.clone().sub(startVec);
                const length   = diff.length();
                if (length < 1) return null;

                const bore   = seg.properties?.bore || 100;
                const pipeR  = is3D ? bore / 2 : 40;
                const isSelected = selectedSegmentId === seg.id;

                // Shorten pipe cylinder to leave room for fitting spheres at each end
                const startNodeType = nodes[seg.startNode]?.type;
                const endNodeType   = nodes[seg.endNode]?.type;
                const fittingTypes  = ['elbow', 'tee'];
                const startFit = fittingTypes.includes(startNodeType);
                const endFit   = fittingTypes.includes(endNodeType);
                const stubLen  = pipeR * 3.0;
                const trimStart = startFit ? stubLen : 0;
                const trimEnd   = endFit   ? stubLen : 0;
                const trimmedLen = length - trimStart - trimEnd;
                if (trimmedLen < 1) return null;

                const dir = diff.clone().normalize();
                const trimmedStart = startVec.clone().addScaledVector(dir, trimStart);
                const mid = trimmedStart.clone().addScaledVector(dir, trimmedLen / 2);
                const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

                let color = isSelected ? '#f59e0b' : '#94a3b8';
                if (seg.properties?.type === 'FITTING_LEG') color = '#32cd32';

                return (
                    <mesh key={seg.id} position={mid.toArray()} quaternion={quaternion}
                        onClick={(e) => {
                            if (activeTool !== 'select') return;
                            e.stopPropagation();
                            setSelectedSegmentId(seg.id);
                        }}>
                        <cylinderGeometry args={[pipeR, pipeR, trimmedLen, 10]} />
                        <meshBasicMaterial color={color} />
                    </mesh>
                );
            })}

            {/* ── Node-based fittings ── */}
            {Object.entries(nodes).map(([id, node]) => {
                const conns = nodeConnections[id] || [];
                const nodePos = node.pos;
                const connectedBores = conns.map(c => {
                    const seg = segments.find(s => s.id === c.seg);
                    return seg?.properties?.bore || 100;
                });
                const bore = connectedBores.length > 0 ? Math.max(...connectedBores) : 100;
                const pipeR  = is3D ? bore / 2 : 40;
                const isNodeSel = selectedNodeId === id;

                // Direction vectors FROM this node to each connected node
                const dirs = conns.map(({ seg, isStart }) => {
                    const otherId = isStart ? seg.endNode : seg.startNode;
                    const other   = nodes[otherId];
                    if (!other) return null;
                    return new THREE.Vector3(...other.pos)
                        .sub(new THREE.Vector3(...nodePos))
                        .normalize();
                }).filter(Boolean);

                if (node.type === 'elbow' && dirs.length >= 2) {
                    return (
                        <ElbowFitting
                            key={`elbow-${id}`}
                            nodePos={nodePos}
                            dirs={dirs.slice(0, 2)}
                            pipeR={pipeR}
                            isSelected={isNodeSel}
                        />
                    );
                }

                if (node.type === 'tee' && dirs.length >= 3) {
                    return (
                        <TeeFitting
                            key={`tee-${id}`}
                            nodePos={nodePos}
                            dirs={dirs.slice(0, 3)}
                            pipeR={pipeR}
                            isSelected={isNodeSel}
                        />
                    );
                }

                return null;
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
    const undo = useSketchStore(s => s.undo);
    const redo = useSketchStore(s => s.redo);
    const deleteNode = useSketchStore(s => s.deleteNode);
    const selectedNodeId = useSketchStore(s => s.selectedNodeId);
    const topologyDiagnostics = useSketchStore(s => s.topologyDiagnostics);
    const showTopologyDiagnostics = useSketchStore(s => s.showTopologyDiagnostics);
    const lastDraftingCommand = useSketchStore(s => s.lastDraftingCommand);
    const topologyValidationSummary = useSketchStore(s => s.topologyValidationSummary);
    const setShowTopologyDiagnostics = useSketchStore(s => s.setShowTopologyDiagnostics);

    const [isAltHeld, setIsAltHeld] = React.useState(false);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Alt') {
                e.preventDefault(); // prevent browser menu stealing
                setIsAltHeld(true);
            }
            if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                undo();
            }
            if ((e.ctrlKey && e.key.toLowerCase() === 'y') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z')) {
                e.preventDefault();
                redo();
            }
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
                // If focus is in an input, don't delete node
                if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') {
                    return;
                }
                e.preventDefault();
                deleteNode(selectedNodeId);
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
    }, [undo, redo, selectedNodeId, deleteNode]);

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
                <SegmentEditorPanel />
                {showTopologyDiagnostics && (
                    <TopologyDiagnosticsPanel
                        diagnostics={topologyDiagnostics}
                        lastCommand={lastDraftingCommand}
                        summary={topologyValidationSummary}
                        onClose={() => setShowTopologyDiagnostics(false)}
                    />
                )}

                <ErrorBoundary>
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
                </ErrorBoundary>

                {/* PiP 3D Container (Top Right) */}
                <div style={{ 
                    position: 'absolute', top: 16, right: 16, width: '300px', height: '300px', 
                    background: '#1e293b', border: '2px solid #3b82f6', borderRadius: '8px', 
                    overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' 
                }}>
                    <div style={{ position: 'absolute', top: 4, left: 8, zIndex: 10, color: '#38bdf8', fontSize: '10px', fontWeight: 'bold', textShadow: '1px 1px 2px black' }}>3D VERIFICATION VIEW</div>
                    <ErrorBoundary>
                        <Canvas>
                            <PerspectiveCamera makeDefault position={[5000, 5000, 5000]} fov={50} />
                            <OrbitControls makeDefault />
                            <ambientLight intensity={0.5} />
                            <directionalLight position={[10, 10, 5]} intensity={1} />
                            <VerificationViewBounds />
                            <GraphRenderer is3D={true} />
                        </Canvas>
                    </ErrorBoundary>
                </div>
            </div>
        </div>
    );
};

export default SketcherTab;
