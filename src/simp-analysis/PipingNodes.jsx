import React from 'react';
import { useThree } from '@react-three/fiber';
import { useDrag } from '@use-gesture/react';
import { useSimpStore } from './store';
import { Vector3 } from 'three';
import { Html } from '@react-three/drei';

export const PipingNodes = () => {
  const nodes = useSimpStore(state => state.nodes);
  const moveNode = useSimpStore(state => state.moveNode);
  const plane = useSimpStore(state => state.plane);
  const { size, camera } = useThree();

  const setOrbitEnabled = useSimpStore(state => state.setOrbitEnabled);

  const bind = useDrag(({ active, event, movement: [mx, my], args: [id], memo }) => {
    if (event) event.stopPropagation();

    // Start of drag: remember initial node position
    if (!memo) {
      memo = [...nodes[id].pos];
      if (setOrbitEnabled) setOrbitEnabled(false);
    }

    // Calculate new position using accumulated movement
    const worldDx = mx / camera.zoom;
    const worldDy = -my / camera.zoom; // Invert Y because screen Y goes down, world Y goes up

    let newPos = [...memo];
    if (plane === 'XY') { newPos[0] += worldDx; newPos[1] += worldDy; }
    if (plane === 'XZ') { newPos[0] += worldDx; newPos[2] -= worldDy; }
    if (plane === 'YZ') { newPos[1] += worldDx; newPos[2] += worldDy; }

    // Grid snap to 100mm
    newPos = newPos.map(v => Math.round(v / 100) * 100);
    moveNode(id, newPos);

    if (!active) {
      if (setOrbitEnabled) setOrbitEnabled(true);
      return memo; // Final return
    }

    return memo;
  });

  return (
    <group>
      {Object.entries(nodes).map(([id, node]) => (
        <mesh
          key={id}
          position={node.pos}
          {...bind(id)}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <sphereGeometry args={[200, 32, 32]} />
          <meshStandardMaterial color={node.type === 'anchor' ? 'blue' : 'orange'} />
          <Html position={[0, 300, 0]} center zIndexRange={[100, 0]}>
            <div style={{color: 'white', background: 'black', padding: '2px 5px', fontSize: '10px'}}>{id}</div>
          </Html>
        </mesh>
      ))}
    </group>
  );
};
