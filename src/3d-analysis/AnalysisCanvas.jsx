import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, OrthographicCamera, Environment, GizmoHelper, GizmoViewport, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useAnalysisStore } from './AnalysisStore';
import { NodeMesh } from './NodeMesh';
import { SegmentMesh } from './SegmentMesh';
import { MarqueeZoom } from './MarqueeZoom';

const CameraController = () => {
    const { camera, scene } = useThree();
    const controlsRef = useRef();

    const selectedSegmentIds = useAnalysisStore(s => s.selectedSegmentIds);
    const selectedNodeId = useAnalysisStore(s => s.selectedNodeId);
    const nodes = useAnalysisStore(s => s.nodes);

    const cameraViewMode = useAnalysisStore(s => s.cameraViewMode);

    // Store target vectors
    const targetCenter = useRef(new THREE.Vector3(0, 0, 0));
    const targetDistance = useRef(10000);
    const targetPosition = useRef(new THREE.Vector3(5000, 5000, 5000));

    // Calculate target whenever selection or view mode changes
    useEffect(() => {
        const box = new THREE.Box3();
        let hasSelection = false;

        if (selectedNodeId && nodes[selectedNodeId]) {
            const pos = nodes[selectedNodeId].pos;
            box.expandByPoint(new THREE.Vector3(pos[0], pos[1], pos[2]));
            hasSelection = true;
        } else if (selectedSegmentIds.size > 0) {
            // Strictly compute bounds mathematically from Zustand state, ignoring massive background Grids
            selectedSegmentIds.forEach(id => {
                const seg = useAnalysisStore.getState().segments.find(s => s.id === id);
                if (seg) {
                    const n1 = nodes[seg.startNode];
                    const n2 = nodes[seg.endNode];
                    if (n1) box.expandByPoint(new THREE.Vector3(...n1.pos));
                    if (n2) box.expandByPoint(new THREE.Vector3(...n2.pos));
                }
            });
            if (!box.isEmpty()) hasSelection = true;
        }

        if (!hasSelection || cameraViewMode === 'auto' || ['top', 'front', 'iso'].includes(cameraViewMode)) {
            // Safely iterate strictly over pipeline nodes to build bounding box.
            // DO NOT use `box.setFromObject(scene)` because it includes the infinite Grid and Gizmos.
            const nodeValues = Object.values(nodes);
            if (nodeValues.length > 0) {
                nodeValues.forEach(n => box.expandByPoint(new THREE.Vector3(...n.pos)));
            } else {
                // If the state is empty (e.g. at startup), provide a tiny default bounds
                box.min.set(-100, -100, -100);
                box.max.set(100, 100, 100);
            }
        }

        box.getCenter(targetCenter.current);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const safeMaxDim = maxDim === 0 ? 1000 : maxDim;

        // Standard perspective fallback FOV math
        const fov = (camera.type === 'PerspectiveCamera' ? camera.fov : 50) * (Math.PI / 180);
        const boundingSphereRadius = (safeMaxDim / 2) * Math.sqrt(3);
        let dist = (boundingSphereRadius * 1.2) / Math.sin(fov / 2);
        targetDistance.current = Math.max(dist, 1500); // enforce floor to avoid microscopic scaling

        // Determine target position based on mode
        if (cameraViewMode === 'iso' || cameraViewMode === 'auto') {
            const offset = Math.sqrt((targetDistance.current * targetDistance.current) / 3);
            targetPosition.current.set(
                targetCenter.current.x + offset,
                targetCenter.current.y + offset,
                targetCenter.current.z + offset
            );
        } else if (cameraViewMode === 'top') {
            targetPosition.current.set(
                targetCenter.current.x,
                targetCenter.current.y + targetDistance.current,
                targetCenter.current.z
            );
        } else if (cameraViewMode === 'front') {
            targetPosition.current.set(
                targetCenter.current.x,
                targetCenter.current.y,
                targetCenter.current.z + targetDistance.current
            );
        } else if (cameraViewMode === 'selected') {
            const currentDir = new THREE.Vector3().subVectors(camera.position, controlsRef.current?.target || targetCenter.current).normalize();
            if (currentDir.length() < 0.1) currentDir.set(1, 1, 1).normalize();
            targetPosition.current.copy(targetCenter.current).add(currentDir.multiplyScalar(targetDistance.current));
        }

        // Dynamic Z-Clipping based strictly on the pipeline math bounds
        if (!box.isEmpty()) {
            camera.near = Math.max(1, safeMaxDim * 0.001);
            camera.far = Math.max(safeMaxDim * 100, targetDistance.current * 10);
            camera.updateProjectionMatrix();

            // Constrain OrbitControls max distance so user cannot zoom past the far plane
            if (controlsRef.current) {
                controlsRef.current.maxDistance = camera.far * 0.9;
            }
        }

    }, [selectedNodeId, selectedSegmentIds, nodes, camera, cameraViewMode]);

    useFrame((state, delta) => {
        if (!controlsRef.current) return;

        // Use standard lerp for guaranteed compatibility across Three.js versions instead of damp3
        const lerpFactor = 1 - Math.exp(-4 * delta);

        // Dampen the orbit target
        controlsRef.current.target.lerp(targetCenter.current, lerpFactor);

        // Only dampen camera position if a view mode button was recently pressed or we selected something explicitly via datagrid
        // For smooth orbit control usage, we only apply position damping if the distance between current and target is significant,
        // or if we're explicitly in a forced camera mode.
        if (cameraViewMode !== 'none') {
            camera.position.lerp(targetPosition.current, lerpFactor);

            // If we are extremely close to the target, release the forced view mode to allow free orbit
            if (camera.position.distanceTo(targetPosition.current) < 10) {
                 useAnalysisStore.getState().setCameraViewMode('none');
            }
        }

        controlsRef.current.update();
    });

    return <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.1} />;
};

const InteractivePlane = () => {
  const activeTool = useAnalysisStore(s => s.activeTool);
  const setActiveTool = useAnalysisStore(s => s.setActiveTool);
  const snapNodeId = useAnalysisStore(s => s.snapNodeId);
  const nodes = useAnalysisStore(s => s.nodes);

  const handleClick = (e) => {
    e.stopPropagation();
    if (activeTool === 'anchor' && snapNodeId && nodes[snapNodeId]) {
      // Future: add anchor to the exact node
      console.log('Placed anchor on node:', snapNodeId);
      setActiveTool('select');
    }
  };

  return (
    <mesh visible={false} onClick={handleClick}>
      <planeGeometry args={[100000, 100000]} />
      <meshBasicMaterial side={THREE.DoubleSide} />
    </mesh>
  );
};

export const AnalysisCanvas = () => {
  const [isOrtho, setIsOrtho] = React.useState(false);

  const segments = useAnalysisStore(s => s.segments);
  const nodes = useAnalysisStore(s => s.nodes);

  const clearSelection = useAnalysisStore(s => s.clearSelection);
  const activeTool = useAnalysisStore(s => s.activeTool);
  const setActiveTool = useAnalysisStore(s => s.setActiveTool);
  const setCameraViewMode = useAnalysisStore(s => s.setCameraViewMode);

  return (
    <div style={{ flex: 1, position: 'relative', background: '#0f172a' }}>

      {/* Top Toolbar Overlay */}
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, display: 'flex', gap: '8px', background: 'rgba(30, 41, 59, 0.8)', padding: '8px', borderRadius: '8px', border: '1px solid #334155' }}>
        <button onClick={() => setCameraViewMode('auto')} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>⛶ Auto Center</button>
        <button onClick={() => setCameraViewMode('selected')} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>🔍 Zoom Selected</button>
        <button
           onClick={() => setActiveTool(activeTool === 'marquee' ? 'select' : 'marquee')}
           title="Click and drag to zoom"
           style={{ background: activeTool === 'marquee' ? '#ef4444' : '#3b82f6', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
        >
          🔲 Marquee
        </button>
        <div style={{ width: '1px', background: '#475569', margin: '0 4px' }} />
        <button onClick={() => setCameraViewMode('top')} style={{ background: '#475569', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Top</button>
        <button onClick={() => setCameraViewMode('front')} style={{ background: '#475569', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Front</button>
        <button onClick={() => setCameraViewMode('iso')} style={{ background: '#475569', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Iso</button>
        <button
           onClick={() => setIsOrtho(!isOrtho)}
           style={{ background: isOrtho ? '#10b981' : '#475569', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
        >
          {isOrtho ? 'Ortho' : 'Persp'}
        </button>
        <div style={{ width: '1px', background: '#475569', margin: '0 4px' }} />
        <button
           onClick={() => setActiveTool(activeTool === 'anchor' ? 'select' : 'anchor')}
           style={{ background: activeTool === 'anchor' ? '#ef4444' : '#475569', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <span style={{ display: 'inline-block', width: '10px', height: '10px', background: 'white', clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></span>
          Add Anchor
        </button>
      </div>

      <Canvas onPointerMissed={() => {
        if (activeTool === 'select') clearSelection();
      }}>
        {isOrtho ? (
            <OrthographicCamera makeDefault position={[5000, 5000, 5000]} zoom={0.1} />
        ) : (
            <PerspectiveCamera makeDefault position={[5000, 5000, 5000]} fov={50} />
        )}

        <CameraController />

        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Grid position={[0, -500, 0]} args={[50000, 50000]} sectionSize={1000} cellColor="#1e293b" sectionColor="#334155" fadeDistance={30000} />

        {/* Adds navigation axes at bottom right */}
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport axisColors={['red', 'green', 'blue']} labelColor="white" />
        </GizmoHelper>

        {activeTool === 'anchor' && <InteractivePlane />}

        <MarqueeZoom />

        <Suspense fallback={null}>
          <group>
            {Object.entries(nodes).map(([id, n]) => (
              <NodeMesh key={id} id={id} pos={n.pos} type={n.type} label={n.label} />
            ))}
            {segments.map(s => {
              const startNode = nodes[s.startNode];
              const endNode = nodes[s.endNode];
              if (!startNode || !endNode) return null;
              return (
                <SegmentMesh
                  key={s.id}
                  id={s.id}
                  startPos={startNode.pos}
                  endPos={endNode.pos}
                  compType={s.compType}
                  length_in={s.length_in}
                />
              );
            })}
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
};
