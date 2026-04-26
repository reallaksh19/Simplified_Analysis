import React from 'react';
import { VERSION_STRING } from '../config/version';
import { MODULE_REGISTRY } from '../config/moduleRegistry';

export const DiagnosticsTab = () => {
  return (
    <div style={{ padding: '24px', color: '#fff' }}>
      <h2>Debug / Diagnostics</h2>
      <p>Current Version: {VERSION_STRING}</p>
      {MODULE_REGISTRY ? (
        <div>
          <h3>Active Module Registry</h3>
          <ul>
            {MODULE_REGISTRY.map(mod => (
              <li key={mod.id}><strong>{mod.displayName}</strong>: {mod.status} ({mod.engineeringLevel})</li>
            ))}
          </ul>
        </div>
      ) : (
         <p>Module Registry not yet initialized.</p>
      )}
    </div>
  );
};
