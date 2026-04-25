import React from 'react';
import { OrthographicCamera, Grid } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useSimpStore } from './store';

export const ViewportControls = () => {
  const { size } = useThree();
  const plane = useSimpStore(state => state.plane);

  // Set camera based on plane
  let camPos = [3000, 2000, 20000];
  let up = [0, 1, 0];
  if (plane === 'XZ') {
    camPos = [0, 10000, 0];
    up = [0, 0, -1];
  } else if (plane === 'YZ') {
    camPos = [10000, 0, 0];
    up = [0, 1, 0];
  }

  return (
    <>
      <OrthographicCamera makeDefault position={camPos} zoom={0.1} near={-50000} far={50000} up={up} />
      <Grid
        infiniteGrid
        fadeDistance={50000}
        sectionSize={1000}
        cellColor="#6f6f6f"
        sectionColor="#9d4b4b"
        position={[0,0,0]}
        rotation={plane === 'XZ' ? [0, 0, 0] : plane === 'YZ' ? [0, 0, Math.PI/2] : [Math.PI/2, 0, 0]}
      />
    </>
  );
};
