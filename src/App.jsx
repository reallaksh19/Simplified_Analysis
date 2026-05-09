import React from 'react';
import { useAppStore } from './store/appStore';
import { TopNav } from './components/TopNav';
import { DataTableTab } from './components/DataTableTab';
import { CalcExtendedTab } from './calc-extended/components/CalcExtendedTab';
import { Viewer3DTab } from './components/Viewer3DTab';
import SketcherTab from './sketcher/SketcherTab';
import { AnalysisTab } from './3d-analysis';
import './App.css';

import { ReportsTab } from './reporting/ReportsTab';
import { SettingsTab } from './settings/SettingsTab';
import { DiagnosticsTab } from './components/DiagnosticsTab';
import { BenchmarksValidationTab } from './components/BenchmarksValidationTab';
import PipeRackTab from './piperack/components/PipeRackTab';
import MasterDbEditorTab from './masterDb/MasterDbEditorTab.jsx';

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
      {activeTab === 'simpAnalysis' && <CalcExtendedTab />}
      {activeTab === '3d-analysis' && <AnalysisTab />}
      {activeTab === 'master-db' && <MasterDbEditorTab />}
      {activeTab === 'reports' && <ReportsTab />}
      {activeTab === 'benchmarks' && <BenchmarksValidationTab />}
      {activeTab === 'settings' && <SettingsTab />}
      {activeTab === 'diagnostics' && <DiagnosticsTab />}
</div>
  );
}

export default App;
