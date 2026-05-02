import React, { useEffect, useState } from 'react';
import { useExtendedStore } from '../store/useExtendedStore';
import { useAppStore } from '../../store/appStore';
import DashboardView from './DashboardView';
import PipeRackTab from '../../piperack/components/PipeRackTab';
import Bundle2DSolverView from './Bundle2DSolverView';
import ConfigDatabaseTab from './ConfigDatabaseTab';
import GlobalDebugTab from './GlobalDebugTab';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 49px)', // Accounting for TopNav
    width: '100%',
    backgroundColor: '#020617', // Slate 950
    color: '#e2e8f0',
    overflow: 'hidden',
  },
  subNav: {
    display: 'flex',
    alignItems: 'center',
    background: '#1e293b',
    borderBottom: '1px solid #334155',
    padding: '0 24px',
    height: '50px',
    flexShrink: 0
  },
  subTab: (isActive) => ({
    padding: '0 24px',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    color: isActive ? '#38bdf8' : '#94a3b8',
    borderBottom: isActive ? '2px solid #38bdf8' : '2px solid transparent',
    fontWeight: isActive ? 'bold' : 'normal',
    fontSize: '13px',
    userSelect: 'none'
  }),
  toggleWrapper: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#94a3b8'
  },
  select: {
    background: '#0f172a',
    color: '#fff',
    border: '1px solid #334155',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '12px'
  }
};

export function CalcExtendedTab() {
  const { activeSubTab, setActiveSubTab, methodology, setMethodology, importFromCanonicalGeometry } = useExtendedStore();
  const activeCanonicalGeometry = useAppStore(state => state.activeCanonicalGeometry);

  // Auto-import geometry from the Phase 2/3 canonical geometry store.
  // Calc Extended no longer reads non-existent appStore.nodes/appStore.segments.
  useEffect(() => {
    if (activeCanonicalGeometry?.nodes?.length || activeCanonicalGeometry?.segments?.length) {
      importFromCanonicalGeometry(activeCanonicalGeometry, 'calc-extended-active-canonical');
    }
  }, [importFromCanonicalGeometry, activeCanonicalGeometry]);

  // Force re-render of canvases after tab switch to avoid resize bugs
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
      setMounted(true);
  }, [activeSubTab]);

  return (
    <div style={styles.container}>
      <div style={styles.subNav}>
        <div style={styles.subTab(activeSubTab === '2d')} onClick={() => setActiveSubTab('2d')}>2D Solver</div>
        <div style={styles.subTab(activeSubTab === '3d')} onClick={() => setActiveSubTab('3d')}>3D Solver</div>
        <div style={styles.subTab(activeSubTab === 'piperack')} onClick={() => setActiveSubTab('piperack')}>Pipe Rack Calc</div>
        <div style={styles.subTab(activeSubTab === 'config')} onClick={() => setActiveSubTab('config')}>Config & DB</div>
        <div style={styles.subTab(activeSubTab === 'debug')} onClick={() => setActiveSubTab('debug')}>Debug Steps</div>

        <div style={styles.toggleWrapper}>
          Methodology:
          <select style={styles.select} value={methodology} onChange={e => setMethodology(e.target.value)}>
            <option value="FLUOR">Fluor (Guided Cantilever + MIST)</option>
            <option value="2D_BUNDLE">Simp. 2D Bundle Equations</option>
          </select>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Render Canvas components with display: none when inactive instead of unmounting to prevent WebGL Context Loss */}
        <div className="subtab-content" style={{ display: activeSubTab === '2d' ? 'flex' : 'none', flex: 1, flexDirection: 'column', height: '100%' }}>
          <Bundle2DSolverView />
        </div>
        <div className="subtab-content" style={{ display: activeSubTab === '3d' ? 'flex' : 'none', flex: 1, flexDirection: 'column', height: '100%' }}>
          <DashboardView />
        </div>
        <div className="subtab-content" style={{ display: activeSubTab === 'piperack' ? 'flex' : 'none', flex: 1, flexDirection: 'column', height: '100%' }}>
          <PipeRackTab />
        </div>
        <div className="subtab-content" style={{ display: activeSubTab === 'config' ? 'flex' : 'none', flex: 1, flexDirection: 'column', height: '100%' }}>
          <ConfigDatabaseTab />
        </div>
        <div className="subtab-content" style={{ display: activeSubTab === 'debug' ? 'flex' : 'none', flex: 1, flexDirection: 'column', height: '100%' }}>
          <GlobalDebugTab />
        </div>
      </div>
    </div>
  );
}
