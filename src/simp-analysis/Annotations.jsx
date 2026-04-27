import React from 'react';
import { Html } from '@react-three/drei';

export const Annotation = ({ position, text }) => (
  <Html position={position} center transform={false} zIndexRange={[100, 0]}>
    <div style={{
      background: 'rgba(0,0,0,0.7)',
      color: '#fff',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontFamily: 'monospace',
      pointerEvents: 'none',
      whiteSpace: 'nowrap'
    }}>
      {text}
    </div>
  </Html>
);
