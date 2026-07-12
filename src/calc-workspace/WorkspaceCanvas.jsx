/**
 * Functionality: renders imported RVM workspace geometry in an independent
 * Three.js scene with orbit/pan/zoom, fit/view controls, selection picking,
 * and layer visibility. Parameters: cloned workspace data plus selection/layer
 * UI state. Outputs: canvas primitives and selection callbacks. Fallback:
 * objects without coordinates are skipped while remaining properties stay
 * visible in table/property panels.
 */

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Grid, Html, OrbitControls, PerspectiveCamera, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
import { Maximize, Focus, Eye, EyeOff, Box, ArrowDown, ArrowRight, ArrowLeft, MousePointer2, Move, ZoomIn, Rotate3d } from 'lucide-react';
import { useCalculationWorkspaceStore } from './useCalculationWorkspaceStore.js';
import { renderableWorkspaceObjects } from './workspaceModel.js';

const VIEW_OFFSETS = {
  iso: [1, 0.85, 1],
  top: [0, 1, 0.001],
  front: [0, 0.001, 1],
  side: [1, 0.001, 0],
};

export default function WorkspaceCanvas() {
  const workspace = useCalculationWorkspaceStore((state) => state.workspace);
  const selectedObjectId = useCalculationWorkspaceStore((state) => state.selectedObjectId);
  const selectObject = useCalculationWorkspaceStore((state) => state.selectObject);
  const layerVisibility = useCalculationWorkspaceStore((state) => state.layerVisibility);
  const setLayerVisibility = useCalculationWorkspaceStore((state) => state.setLayerVisibility);
  const isolatedObjectIds = useCalculationWorkspaceStore((state) => state.isolatedObjectIds);
  const isolateSelected = useCalculationWorkspaceStore((state) => state.isolateSelected);
  const showAllObjects = useCalculationWorkspaceStore((state) => state.showAllObjects);
  const hierarchy = useCalculationWorkspaceStore((state) => state.hierarchy);
  const [viewMode, setViewMode] = useState('iso');
  const [fitVersion, setFitVersion] = useState(0);
  const model = useMemo(() => renderableWorkspaceObjects(workspace), [workspace]);
  
  const selectedObjectIds = useMemo(() => {
    if (!selectedObjectId) return new Set();
    let ids = new Set([selectedObjectId]);
    const findBranch = (branches, id) => {
      for (const b of branches) {
        if (b.id === id) return b;
        if (b.children) {
          const found = findBranch(b.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    const branch = findBranch(hierarchy, selectedObjectId);
    if (branch) ids = new Set(branch.objectIds);
    return ids;
  }, [selectedObjectId, hierarchy]);

  const visibleIds = new Set(isolatedObjectIds || []);
  const visibleObjects = model.objects.filter((object) => {
    if (visibleIds.size && !visibleIds.has(object.id)) return false;
    if (object.isSupport && !layerVisibility.supports) return false;
    if (object.isPipe && !layerVisibility.pipes) return false;
    return true;
  });

  return (
    <div className="cw-canvas-shell">
      <div className="cw-canvas-toolbar" style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'absolute', left: '16px', top: '16px', zIndex: 10, background: 'rgba(15,23,42,0.7)', padding: '6px', borderRadius: '8px', border: '1px solid #334155', backdropFilter: 'blur(4px)' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button type="button" className="cw-icon-btn" title="Select (Click object)" style={{ background: '#3b82f6', color: '#fff' }}><MousePointer2 size={16} /></button>
          <button type="button" className="cw-icon-btn" title="Orbit (Left Click + Drag)"><Rotate3d size={16} /></button>
          <button type="button" className="cw-icon-btn" title="Pan (Right Click + Drag)"><Move size={16} /></button>
          <button type="button" className="cw-icon-btn" title="Zoom (Scroll)"><ZoomIn size={16} /></button>
        </div>
        <div style={{ height: '1px', background: '#334155', margin: '4px 0' }}></div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button type="button" className="cw-icon-btn" title="Fit All" onClick={() => setFitVersion((value) => value + 1)}><Maximize size={16} /></button>
          <button type="button" className="cw-icon-btn" title="Fit Selected" onClick={() => { setViewMode('selected'); setFitVersion((value) => value + 1); }}><Focus size={16} /></button>
          <button type="button" className="cw-icon-btn" title="Isolate Selected" onClick={isolateSelected} disabled={!selectedObjectId}><EyeOff size={16} /></button>
          <button type="button" className="cw-icon-btn" title="Show All" onClick={showAllObjects}><Eye size={16} /></button>
        </div>
        <div style={{ height: '1px', background: '#334155', margin: '4px 0' }}></div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button type="button" className="cw-icon-btn" title="ISO View" onClick={() => setViewMode('iso')}><Box size={16} /></button>
          <button type="button" className="cw-icon-btn" title="Top View" onClick={() => setViewMode('top')}><ArrowDown size={16} /></button>
          <button type="button" className="cw-icon-btn" title="Front View" onClick={() => setViewMode('front')}><ArrowRight size={16} /></button>
          <button type="button" className="cw-icon-btn" title="Side View" onClick={() => setViewMode('side')}><ArrowLeft size={16} /></button>
        </div>
      </div>
      <Canvas className="cw-canvas" onPointerMissed={() => selectObject('')}>
        <PerspectiveCamera makeDefault position={[120, 90, 120]} fov={48} />
        <CameraController
          bounds={model.bounds}
          objects={visibleObjects}
          selectedObjectIds={selectedObjectIds}
          viewMode={viewMode}
          fitVersion={fitVersion}
        />
        <ambientLight intensity={0.6} />
        <directionalLight position={[80, 120, 70]} intensity={1.2} />
        <Grid args={[260, 260]} sectionSize={20} cellSize={5} position={[0, -42, 0]} cellColor="#1e3a5f" sectionColor="#315070" fadeDistance={360} />
        <GizmoHelper alignment="bottom-right" margin={[70, 70]}>
          <GizmoViewport axisColors={['#ef4444', '#22c55e', '#3b82f6']} labelColor="#e5eefb" />
        </GizmoHelper>
        <Suspense fallback={null}>
          <group>
            {visibleObjects.map((object) => (
              <WorkspacePrimitive
                key={object.id}
                primitive={object}
                bounds={model.bounds}
                selected={selectedObjectIds.has(object.id)}
                labels={layerVisibility.labels}
                centerlines={layerVisibility.centerlines}
                onSelect={selectObject}
              />
            ))}
          </group>
        </Suspense>
      </Canvas>
      {!workspace && <div className="cw-canvas-empty">Import an enriched RVM workspace package to render geometry.</div>}
    </div>
  );
}

function CameraController({ bounds, objects, selectedObjectIds, viewMode, fitVersion }) {
  const { camera } = useThree();
  const controlsRef = useRef(null);
  const previousFit = useRef(-1);

  useEffect(() => {
    if (!controlsRef.current || previousFit.current === fitVersion) return;
    previousFit.current = fitVersion;
    const targetBounds = selectedBounds(objects, selectedObjectIds) || bounds;
    moveCamera(camera, controlsRef.current, bounds, targetBounds, viewMode);
  }, [bounds, camera, fitVersion, objects, selectedObjectIds, viewMode]);

  useEffect(() => {
    if (!controlsRef.current) return;
    moveCamera(camera, controlsRef.current, bounds, bounds, viewMode);
  }, [bounds, camera, viewMode]);

  return <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.08} />;
}

function WorkspacePrimitive({ primitive, bounds, selected, labels, centerlines, onSelect }) {
  const start = scenePoint(primitive.start || primitive.center, bounds);
  const end = scenePoint(primitive.end || primitive.center, bounds);
  const center = scenePoint(primitive.center, bounds);
  const color = selected ? '#f97316' : primitiveColor(primitive);
  const radius = primitive.isSupport ? 1.1 : 0.42;
  const label = primitive.name || primitive.id;

  if (primitive.isSupport || !primitive.start || !primitive.end || primitive.lengthMm === 0) {
    return (
      <group position={center}>
        <mesh onClick={(event) => { event.stopPropagation(); onSelect(primitive.id); }}>
          <boxGeometry args={[2.2, 2.2, 2.2]} />
          <meshStandardMaterial color={color} emissive={selected ? '#7c2d12' : '#000000'} metalness={0.15} roughness={0.45} />
        </mesh>
        {labels && <Label text={label} />}
      </group>
    );
  }

  return (
    <group>
      {centerlines && <Line start={start} end={end} selected={selected} />}
      <CylinderBetween start={start} end={end} radius={radius} color={color} selected={selected} onClick={() => onSelect(primitive.id)} />
      {labels && <group position={center}><Label text={label} /></group>}
    </group>
  );
}

function CylinderBetween({ start, end, radius, color, selected, onClick }) {
  const direction = new THREE.Vector3().subVectors(new THREE.Vector3(...end), new THREE.Vector3(...start));
  const length = direction.length();
  if (length < 0.001) return null;
  const mid = new THREE.Vector3(...start).add(new THREE.Vector3(...end)).multiplyScalar(0.5);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  return (
    <mesh position={mid} quaternion={quaternion} onClick={(event) => { event.stopPropagation(); onClick(); }}>
      <cylinderGeometry args={[radius, radius, length, 14]} />
      <meshStandardMaterial color={color} emissive={selected ? '#7c2d12' : '#000000'} metalness={0.2} roughness={0.35} />
    </mesh>
  );
}

function Line({ start, end, selected }) {
  const points = useMemo(() => [new THREE.Vector3(...start), new THREE.Vector3(...end)], [start, end]);
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  return (
    <line geometry={geometry}>
      <lineBasicMaterial color={selected ? '#fed7aa' : '#93c5fd'} linewidth={1} />
    </line>
  );
}

function Label({ text }) {
  return (
    <Html distanceFactor={14} center style={{ pointerEvents: 'none' }} zIndexRange={[100, 0]}>
      <span className="cw-canvas-label" style={{ background: 'rgba(15,23,42,0.8)', color: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', whiteSpace: 'nowrap', border: '1px solid #334155' }}>
        {text}
      </span>
    </Html>
  );
}

function primitiveColor(primitive) {
  if (primitive.status === 'conflict') return '#ef4444';
  if (primitive.status === 'review') return '#f59e0b';
  if (primitive.status === 'resolved') return '#22c55e';
  if (primitive.isSupport) return '#2dd4bf';
  return '#3b82f6';
}

function scenePoint(point, bounds) {
  const center = bounds?.center || { x: 0, y: 0, z: 0 };
  const scale = scaleForBounds(bounds);
  return [
    (Number(point?.x || 0) - center.x) * scale,
    (Number(point?.y || 0) - center.y) * scale,
    (Number(point?.z || 0) - center.z) * scale,
  ];
}

function scaleForBounds(bounds) {
  const size = bounds?.size || { x: 1, y: 1, z: 1 };
  return 160 / Math.max(size.x, size.y, size.z, 1);
}

function selectedBounds(objects, selectedObjectIds) {
  if (!selectedObjectIds || selectedObjectIds.size === 0) return null;
  const selectedObjects = objects.filter((object) => selectedObjectIds.has(object.id));
  if (selectedObjects.length === 0) return null;
  const points = selectedObjects.flatMap((selected) => [selected.start, selected.end, selected.center].filter(Boolean));
  if (points.length < 2) {
    return { center: points[0] || { x: 0, y: 0, z: 0 }, size: { x: 1, y: 1, z: 1 }, radius: 1 };
  }
  return boundsFromPoints(points);
}

function boundsFromPoints(points) {
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  points.forEach((point) => {
    min.x = Math.min(min.x, point.x); min.y = Math.min(min.y, point.y); min.z = Math.min(min.z, point.z);
    max.x = Math.max(max.x, point.x); max.y = Math.max(max.y, point.y); max.z = Math.max(max.z, point.z);
  });
  const size = { x: Math.max(max.x - min.x, 1), y: Math.max(max.y - min.y, 1), z: Math.max(max.z - min.z, 1) };
  return { center: { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 }, size, radius: Math.max(size.x, size.y, size.z) / 2 };
}

function moveCamera(camera, controls, modelBounds, targetBounds, viewMode) {
  const scaledCenter = scenePoint(targetBounds?.center || { x: 0, y: 0, z: 0 }, modelBounds);
  const maxSize = 170;
  const distance = Math.max(maxSize * 1.8, 80);
  const offset = VIEW_OFFSETS[viewMode] || VIEW_OFFSETS.iso;
  camera.position.set(
    scaledCenter[0] + offset[0] * distance,
    scaledCenter[1] + offset[1] * distance,
    scaledCenter[2] + offset[2] * distance,
  );
  camera.near = 0.1;
  camera.far = 5000;
  camera.updateProjectionMatrix();
  controls.target.set(scaledCenter[0], scaledCenter[1], scaledCenter[2]);
  controls.update();
}
