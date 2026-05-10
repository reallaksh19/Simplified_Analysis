import React from 'react';
import { useAppStore } from '../store/appStore';
import { Box, Layers, Activity, Calculator, Settings, Table, PenTool, Home, FileText, CheckSquare, Wrench } from 'lucide-react';
import { VERSION_STRING } from '../config/version';

export const TopNav = () => {
  const { activeTab, setActiveTab } = useAppStore();

  const TabItem = ({ name, id, icon: Icon }) => {
    const isActive = activeTab === id;
    return (
      <div
        data-testid={`nav-tab-${id}`}
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

        <TabItem id="home" name="Home" icon={Home} />
        <TabItem id="pcf" name="PCF Import" icon={Table} />
        <TabItem id="sketcher" name="Geometry / Sketcher" icon={PenTool} />
        <TabItem id="3d-analysis" name="3D Simplified Calculation" icon={Layers} />
        <TabItem id="simpAnalysis" name="2D/3D/Pipe Rack Solver" icon={Activity} />
        <TabItem id="reports" name="Reports" icon={FileText} />
        <TabItem id="benchmarks" name="Benchmarks / Validation" icon={CheckSquare} />
        <TabItem id="settings" name="Settings / Defaults" icon={Settings} />
        <TabItem id="diagnostics" name="Debug / Diagnostics" icon={Wrench} />
</div>
      <div style={{ padding: '0 24px', fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
        {VERSION_STRING}
      </div>
    </div>
  );
};
