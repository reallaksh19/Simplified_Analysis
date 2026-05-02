import React, { useState } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useAnalysisStore } from './AnalysisStore';

const COLORS = {
  PIPE: '#60a5fa', // Light Blue (better contrast against dark background)
  ELBOW: '#4ade80', // Light Green
  BEND: '#4ade80',
  TEE: '#f472b6', // Light Pink
  VALVE: '#fb923c', // Light Orange
  FLANGE: '#c084fc', // Light Purple
  REDUCER: '#fcd34d', // Light Yellow
  SUPPORT: '#94a3b8' // Light Slate
};

export const SegmentMesh = ({ id, startPos, endPos, compType, length_in }) => {
  const [hovered, setHovered] = useState(false);
  const selectedSegmentIds = useAnalysisStore(s => s.selectedSegmentIds);
  const toggleSegmentSelection = useAnalysisStore(s => s.toggleSegmentSelection);
  const colorMode = useAnalysisStore(s => s.colorMode);
  const activeTool = useAnalysisStore(s => s.activeTool);
  const splitSegmentAtPoint = useAnalysisStore(s => s.splitSegmentAtPoint);
  const segmentData = useAnalysisStore(s => s.segments.find(seg => seg.id === id));

  const isSelected = selectedSegmentIds.has(id);

  const startVec = new THREE.Vector3(...startPos);
  const endVec = new THREE.Vector3(...endPos);
  const diff = new THREE.Vector3().subVectors(endVec, startVec);
  const length = diff.length();
  const mid = startVec.clone().add(diff.clone().multiplyScalar(0.5));

  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    diff.clone().normalize()
  );

  const legResults = useAnalysisStore(s => s.legResults);
  const params = useAnalysisStore(s => s.params);

  let baseColor = COLORS[compType] || COLORS.PIPE;

  if (colorMode === 'stress') {
      // Allow for both GC3D (legId, Sb_psi) and Extended (id, ratio, stress) formats
      const res = legResults.find(r => r.legId === id || r.id === id);
      const SA = params.Sa_psi;
      if (res) {
          const ratio = res.ratio !== undefined ? res.ratio : (SA > 0 ? (res.Sb_psi || 0) / SA : 0);

          if (ratio < 0.5) baseColor = '#32cd32'; // LimeGreen (< 50%)
          else if (ratio < 1.0) baseColor = '#ffff00'; // Yellow (50% - 99%)
          else baseColor = '#ff0000'; // Red (>= 100%)
      } else {
          baseColor = '#475569'; // Grey out if no data
      }
  }

  const color = isSelected ? '#ffa500' : (hovered ? '#ffffff' : baseColor);

  // Dynamic radius based on segment OD if available, otherwise fallback to 80
  const radius = segmentData?.od_in ? (segmentData.od_in * 25.4) / 2 : 80;

  return (
    <group position={mid} quaternion={quaternion}>
      <mesh
        userData={{ isSegment: true, id }}
        onClick={(e) => {
          e.stopPropagation();
          if (activeTool === 'anchor') {
              if (e.point) splitSegmentAtPoint(id, e.point);
          } else {
              toggleSegmentSelection(id, e.shiftKey || e.ctrlKey || e.metaKey);
          }
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          if (activeTool === 'anchor') document.body.style.cursor = 'crosshair';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          if (activeTool === 'anchor') document.body.style.cursor = 'default';
        }}
      >
        <cylinderGeometry args={[radius, radius, length, 16]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
      </mesh>
      {isSelected && (
        <Html position={[0, 0, radius + 50]} center zIndexRange={[100, 0]}>
          <div style={{ color: '#fff', background: 'rgba(0,0,0,0.8)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
            L={((length_in || 0) * 25.4).toFixed(0)}mm ({(length_in || 0).toFixed(1)}in)
          </div>
        </Html>
      )}
    </group>
  );
};
