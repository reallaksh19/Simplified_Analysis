import React from 'react';
import { useThree } from '@react-three/fiber';
import { Grid } from '@react-three/drei';

import { useFrame } from '@react-three/fiber';
import { useState } from 'react';

export const DynamicGrid = ({ workingPlane }) => {
    const { camera } = useThree();
    const [zoom, setZoom] = useState(camera.zoom || 0.2);

    // Auto-scale grid based on orthographic zoom.
    useFrame(() => {
        if (camera.zoom !== zoom) {
            setZoom(camera.zoom);
        }
    });

    const baseSize = 1000;

    let scale = 1;
    if (zoom < 0.05) scale = 10;
    else if (zoom > 1) scale = 0.1;

    return (
        <Grid
            position={[0, 0, 0]}
            args={[500000, 500000]}
            sectionSize={baseSize * scale}
            cellSize={baseSize * scale / 10}
            cellColor="#1e293b"
            sectionColor="#334155"
            fadeDistance={30000 / zoom}
            rotation={workingPlane === 'XY' ? [Math.PI/2, 0, 0] : (workingPlane === 'XZ' ? [0, 0, 0] : [0, 0, Math.PI/2])}
        />
    );
};
