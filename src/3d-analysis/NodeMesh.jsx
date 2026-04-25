import React, { useState } from 'react';
import { Html, Outlines } from '@react-three/drei';
import { useAnalysisStore } from './AnalysisStore';

export const NodeMesh = ({ id, pos, type, label }) => {
  const [hovered, setHovered] = useState(false);
  const selectedNodeId = useAnalysisStore(s => s.selectedNodeId);
  const setSelectedNode = useAnalysisStore(s => s.setSelectedNode);
  const snapNodeId = useAnalysisStore(s => s.snapNodeId);
  const setSnapNodeId = useAnalysisStore(s => s.setSnapNodeId);
  const isSelected = selectedNodeId === id;
  const isSnapped = snapNodeId === id;

  let color = '#ffa500'; // free
  let radius = 200;
  if (type === 'anchor') { color = '#1e90ff'; radius = 250; }
  else if (type === 'elbow') { color = '#800080'; }
  else if (type === 'tee') { color = '#ffd700'; }

  if (isSnapped) {
    color = '#ef4444'; // Red for snap
    radius = 250;
  }

  const activeTool = useAnalysisStore(s => s.activeTool);
  const convertNodeToAnchor = useAnalysisStore(s => s.convertNodeToAnchor);

  const handleClick = (e) => {
      e.stopPropagation();
      if (activeTool === 'anchor' && type !== 'anchor') {
          convertNodeToAnchor(id);
      } else {
          setSelectedNode(id);
      }
  };

  return (
    <mesh
      position={pos}
      onClick={handleClick}
      onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          setSnapNodeId(id);
          if (activeTool === 'anchor' && type !== 'anchor') document.body.style.cursor = 'crosshair';
      }}
      onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          if (snapNodeId === id) setSnapNodeId(null);
          if (activeTool === 'anchor') document.body.style.cursor = 'default';
      }}
    >
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={hovered ? color : '#000000'}
        emissiveIntensity={0.3}
      />
      {isSelected && <Outlines color="white" thickness={0.1} />}
      <Html position={[0, radius + 50, 0]} center>
        <div style={{ color: '#fff', background: 'rgba(0,0,0,0.7)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', pointerEvents: 'none' }}>
          {label || id}
        </div>
      </Html>
    </mesh>
  );
};
