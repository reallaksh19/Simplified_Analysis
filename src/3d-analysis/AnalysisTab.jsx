import React from 'react';
import { useAnalysisStore } from './AnalysisStore';
import { AnalysisCanvas } from './AnalysisCanvas';
import { ComponentPanel } from './ComponentPanel';
import { DebugConsole } from './DebugConsole';
import { DebugTable } from './DebugTable';
import { ConfigPanel } from './ConfigPanel';
import { Activity } from 'lucide-react';
import { VERSION_STRING } from '../config/version';

import { ChevronDown, ChevronUp } from 'lucide-react';

export const AnalysisTab = () => {
  const { includeSIF, setIncludeSIF, colorMode, setColorMode, dataGridCollapsed, toggleDataGrid } = useAnalysisStore();

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)', overflow: 'hidden' }}>
      <div style={{ height: '56px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#f8fafc', fontWeight: 'bold', fontSize: '18px' }}>
          <Activity size={24} color="#3b82f6" />
          3D Simpl. Analysis
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'normal', marginLeft: '8px' }}>
            {VERSION_STRING}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', fontSize: '12px' }}>
                <span style={{ color: '#94a3b8' }}>Color Mode:</span>
                <select
                    value={colorMode}
                    onChange={e => setColorMode(e.target.value)}
                    style={{ background: '#0f172a', color: '#f8fafc', border: '1px solid #334155', borderRadius: '4px', padding: '4px' }}
                >
                    <option value="type">Component Type</option>
                    <option value="stress">Stress Heatmap</option>
                </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', cursor: 'pointer', fontSize: '12px' }}>
                <input type="checkbox" checked={includeSIF} onChange={e => setIncludeSIF(e.target.checked)} />
                Include SIF & k
            </label>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', flexDirection: 'column', position: 'relative' }}>
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
            <AnalysisCanvas />
            <ComponentPanel />

            {/* Right-side Collapsible Results & Debug Panel */}
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '450px',
              maxHeight: 'calc(100% - 32px)',
              background: 'rgba(15, 23, 42, 0.9)',
              backdropFilter: 'blur(8px)',
              border: '1px solid #334155',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
              zIndex: 10
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', flex: dataGridCollapsed ? '0 0 auto' : '1', transition: 'flex 0.3s' }}>
                    <div
                       style={{ padding: '8px 16px', background: 'rgba(30, 41, 59, 0.9)', borderBottom: '1px solid #334155', fontSize: '12px', fontWeight: 'bold', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                       onClick={toggleDataGrid}
                    >
                        Results Summary
                        {dataGridCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                    {!dataGridCollapsed && (
                      <div style={{ flex: 1, overflow: 'auto', background: 'transparent' }}>
                          <DebugTable />
                      </div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, borderTop: '1px solid #334155', background: 'rgba(15, 23, 42, 0.95)' }}>
                     <DebugConsole />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
