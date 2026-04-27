/* AGENT HANDOFF: 0-BOOT → 1-GC3D, 1-EXT, 1-RACK
 * Date: 2026-04-27
 * Changes:
 *   - src/App.jsx: Wired correct replacement components (CalcExtendedTab, Viewer3DTab).
 *   - src/config/moduleRegistry.js: Removed duplicate and malformed MODULE_REGISTRY causing syntax errors.
 *   - src/index.css: Corrected source path to use calc-extended instead of simp-analysis.
 * Interface changes:
 *   - None.
 * Known open items:
 *   - Agents 1-GC3D, 1-EXT, 1-RACK can now proceed in parallel.
 * Tests run:
 *   - npm run syntax: Passed
 *   - npm run lint: Passed
 *   - npm run test: Passed (smoke-check and moduleRegistry tests passing)
 */
import React from 'react';
import { useAppStore } from './store/appStore';
import { TopNav } from './components/TopNav';
import { DataTableTab } from './components/DataTableTab';
import { CalcExtendedTab } from './calc-extended/components/CalcExtendedTab';
import { Viewer3DTab } from './components/Viewer3DTab';
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
      {activeTab === 'simpAnalysis' && <CalcExtendedTab />}
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
