import React from 'react';
import { useAppStore } from './store/appStore';
import { TopNav } from './components/TopNav';
import { Viewer3DTab } from './components/Viewer3DTab';
import { DataTableTab } from './components/DataTableTab';
import { TransformTab } from './components/TransformTab';
import { SimpAnalysisTab } from './simp-analysis/SimpAnalysisTab';
import { Spl2BundleTab } from './spl2-bundle';
import { ConfigTab } from './config/ConfigTab';
import SketcherTab from './sketcher/SketcherTab';
import { AnalysisTab } from './3d-analysis';
import CalcExtendedTab from './calc-extended/components/CalcExtendedTab';
import './App.css';

function App() {
  const activeTab = useAppStore(state => state.activeTab);

  // Expose store for e2e testing
  if (typeof window !== 'undefined') {
    window.useAppStore = useAppStore;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif', background: '#0f172a' }}>
      <TopNav />
      {activeTab === 'viewer' && <Viewer3DTab />}
      {activeTab === 'datatable' && <DataTableTab />}
      {activeTab === 'transform' && <TransformTab />}
      {activeTab === 'sketcher' && <SketcherTab />}
      {activeTab === 'simpAnalysis' && <SimpAnalysisTab />}
      {activeTab === 'spl2bundle' && <Spl2BundleTab />}
      {activeTab === 'config' && <ConfigTab />}
      {activeTab === '3d-analysis' && <AnalysisTab />}
      {activeTab === 'calcExtended' && <CalcExtendedTab />}
    </div>
  );
}

export default App;
