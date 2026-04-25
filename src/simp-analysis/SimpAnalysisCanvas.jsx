import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ViewportControls } from './ViewportControls';
import { PipingNodes } from './PipingNodes';
import { PipingSegments } from './PipingSegments';
import { OrbitControls } from '@react-three/drei';
import { useSimpStore } from './store';

export const SimpAnalysisCanvas = () => {
  const orbitEnabled = useSimpStore(state => state.orbitEnabled);

  return (
    <Canvas 
      gl={{ alpha: false, antialias: false, powerPreference: "default" }}
      style={{ width: '100%', height: '100%', background: '#0f172a' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      
      <Suspense fallback={null}>
        <ViewportControls />
        <OrbitControls enableRotate={false} enablePan={orbitEnabled} enableZoom={true} />
        <PipingSegments />
        <PipingNodes />
      </Suspense>
    </Canvas>
  );
};
