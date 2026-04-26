import React from 'react';
import { useAppStore } from '../store/appStore';
import { Box, Layers, Activity, Calculator, Settings, Table, PenTool } from 'lucide-react';
import { VERSION_STRING } from '../config/version';

export const TopNav = () => {
  const { activeTab, setActiveTab } = useAppStore();

  const TabItem = ({ name, id, icon: Icon }) => {
    const isActive = activeTab === id;
    return (
      <div
        onClick={() => setActiveTab(id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          cursor: 'pointer',
          background: isActive ? 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)' : 'transparent',
          color: isActive ? '#3b82f6' : '#94a3b8',
          borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
          transition: 'all 0.2s ease-in-out',
          fontWeight: isActive ? '600' : '500',
          fontSize: '14px',
          userSelect: 'none'
        }}
      >
        <Icon size={16} />
        {name}
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      background: '#0f172a', /* Slate 900 */
      borderBottom: '1px solid #1e293b', /* Slate 800 */
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ padding: '0 24px', fontWeight: 'bold', fontSize: '16px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: 24, height: 24, borderRadius: 4, background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12 }}>3D</div>
        Calc Suite
      </div>
      <div style={{ width: '1px', height: '24px', background: '#334155', margin: '0 16px' }} />
      <div style={{ display: 'flex', flex: 1 }}>
        <TabItem id="viewer" name="3D Viewer" icon={Box} />
        <TabItem id="transform" name="3D to 2D Transformation" icon={Layers} />
        <TabItem id="sketcher" name="2D Sketcher" icon={PenTool} />
        <TabItem id="datatable" name="Data Table" icon={Table} />
        <TabItem id="3d-analysis" name="3D Simpl. Analysis" icon={Activity} />
        <TabItem id="spl2bundle" name="SPL2 Legacy Benchmark" icon={Calculator} />
        <TabItem id="calcExtended" name="Calc Extended" icon={Calculator} />
        <TabItem id="config" name="Config" icon={Settings} />
      </div>
      <div style={{ padding: '0 24px', fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
        {VERSION_STRING}
      </div>
    </div>
  );
};
