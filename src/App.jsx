import React from 'react';
import { useAppStore } from './store/appStore';
import { TopNav } from './components/TopNav';
import { DataTableTab } from './components/DataTableTab';
import { SimpAnalysisTab } from './simp-analysis/SimpAnalysisTab';
import { Spl2BundleTab } from './spl2-bundle';
import SketcherTab from './sketcher/SketcherTab';
import { AnalysisTab } from './3d-analysis';
import './App.css';

import { ReportsTab } from './reporting/ReportsTab';
import { SettingsTab } from './settings/SettingsTab';
import { DiagnosticsTab } from './components/DiagnosticsTab';
import PipeRackTab from './piperack/components/PipeRackTab';

function App() {
  const activeTab = useAppStore(state => state.activeTab);

  // Expose store for e2e testing
  if (typeof window !== 'undefined') {
    window.useAppStore = useAppStore;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif', background: '#0f172a' }}>
      <TopNav />

      {activeTab === 'home' && <Viewer3DTab />}
      {activeTab === 'pcf' && <DataTableTab />}
      {activeTab === 'sketcher' && <SketcherTab />}
      {activeTab === 'simpAnalysis' && <SimpAnalysisTab />}
      {activeTab === '3d-analysis' && <AnalysisTab />}
      {activeTab === 'piperack' && <PipeRackTab />}
      {activeTab === 'reports' && <ReportsTab />}
      {activeTab === 'benchmarks' && <Spl2BundleTab />}
      {activeTab === 'settings' && <SettingsTab />}
      {activeTab === 'diagnostics' && <DiagnosticsTab />}
</div>
  );
}

export default App;
