import React, { useMemo, useState } from 'react';
import { useSketchStore } from './SketcherStore';
import { resolveFlangeValveFlangeInsertData } from './componentProperties/componentMasterResolver.js';
import { resolveReducerInsertData } from './componentProperties/b169FittingMasterResolver.js';

const containerStyle = {
  borderTop: '1px solid #334155',
  background: '#020617',
  color: '#cbd5e1',
  fontSize: '12px',
  maxHeight: '260px',
  overflow: 'hidden',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 10px',
  borderBottom: '1px solid #1e293b',
};

const tabButtonStyle = (active) => ({
  border: '1px solid #334155',
  background: active ? '#1d4ed8' : '#0f172a',
  color: active ? '#ffffff' : '#cbd5e1',
  borderRadius: '6px',
  padding: '4px 8px',
  fontSize: '11px',
  cursor: 'pointer',
});

const actionButtonStyle = {
  border: '1px solid #334155',
  background: '#0f172a',
  color: '#e2e8f0',
  borderRadius: '6px',
  padding: '4px 8px',
  cursor: 'pointer',
  fontSize: '11px',
};

const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const thStyle = { textAlign: 'left', padding: '5px 8px', borderBottom: '1px solid #334155', color: '#93c5fd', whiteSpace: 'nowrap' };
const tdStyle = { padding: '5px 8px', borderBottom: '1px solid #1e293b', whiteSpace: 'nowrap' };

function segmentLength(nodes, segment) {
  const a = nodes[segment.startNode]?.pos;
  const b = nodes[segment.endNode]?.pos;
  if (!a || !b) return null;
  return Math.hypot(Number(b[0]) - Number(a[0]), Number(b[1]) - Number(a[1]), Number(b[2]) - Number(a[2]));
}

function classifyNode(node) {
  const type = String(node?.type || 'free').toLowerCase();
  if (['anchor', 'support', 'guide', 'line_stop', 'linestop', 'resting_support', 'spring'].includes(type)) return 'support';
  if (['elbow', 'tee', 'bend', 'olet', 'branch', 'reducer'].includes(type)) return 'fitting';
  if (['valve', 'flange', 'gasket', 'flange_valve_flange'].includes(type)) return 'component';
  return 'node';
}

function buildDiagnostics(state) {
  const out = [];
  for (const item of state.importWarnings || []) {
    if (typeof item === 'string') out.push({ severity: 'warn', code: 'IMPORT_WARNING', message: item });
    else out.push(item);
  }
  for (const item of state.lastImportDiagnostics || []) out.push(item);
  for (const item of state.lastImportLossContract || []) out.push(item);
  for (const item of state.topologyDiagnostics || []) out.push(item);
  return out;
}

function EmptyRow({ colSpan = 6, text = 'No rows.' }) {
  return <tr><td style={{ ...tdStyle, color: '#64748b' }} colSpan={colSpan}>{text}</td></tr>;
}


function QuickInsertButtons() {
  const selectedSegmentId = useSketchStore((s) => s.selectedSegmentId);
  const segments = useSketchStore((s) => s.segments || []);
  const insertReducerOnSelectedSegment = useSketchStore((s) => s.insertReducerOnSelectedSegment);
  const insertFlangeValveFlangeOnSelectedSegment = useSketchStore((s) => s.insertFlangeValveFlangeOnSelectedSegment);
  const selectedSegment = segments.find((segment) => segment.id === selectedSegmentId);
  const selectedDn = selectedSegment?.pipe?.dn ?? selectedSegment?.properties?.bore ?? 200;
  const ratingClass = selectedSegment?.lineClass?.ratingClass ?? selectedSegment?.properties?.ratingClass ?? 300;
  const faceType = selectedSegment?.lineClass?.faceType ?? selectedSegment?.properties?.faceType ?? 'RF';
  const flangeType = selectedSegment?.lineClass?.flangeType ?? selectedSegment?.properties?.flangeType ?? 'WN';
  const valveType = selectedSegment?.lineClass?.valveType ?? selectedSegment?.properties?.valveType ?? 'Flanged Swing check Valve';
  const schedule = selectedSegment?.pipe?.schedule ?? selectedSegment?.properties?.schedule ?? 'STD';
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button type="button" data-testid="element-panel-insert-reducer" disabled={!selectedSegmentId} style={{ ...actionButtonStyle, opacity: selectedSegmentId ? 1 : 0.45 }} onClick={() => { const targetDn = selectedDn > 50 ? selectedDn - 50 : selectedDn; insertReducerOnSelectedSegment(resolveReducerInsertData({ fromDn: selectedDn, toDn: targetDn, reducerType: 'CONCENTRIC', scheduleFrom: schedule, scheduleTo: schedule })); }}>Insert Reducer</button>
      <button type="button" data-testid="element-panel-insert-fvf" disabled={!selectedSegmentId} style={{ ...actionButtonStyle, opacity: selectedSegmentId ? 1 : 0.45 }} onClick={() => { insertFlangeValveFlangeOnSelectedSegment(resolveFlangeValveFlangeInsertData({ dn: selectedDn, ratingClass, valveType, flangeType, faceType })); }}>Insert F-V-F</button>
    </div>
  );
}

export default function ElementListingPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('pipes');
  const state = useSketchStore();

  const nodes = state.nodes || {};
  const segments = state.segments || [];

  const pipes = useMemo(() => segments.filter((s) => String(s.type || s.properties?.type || 'PIPE').toUpperCase() === 'PIPE'), [segments]);
  const nodeRows = useMemo(() => Object.entries(nodes).map(([id, node]) => ({ id, ...node })), [nodes]);
  const fittings = nodeRows.filter((node) => classifyNode(node) === 'fitting');
  const components = nodeRows.filter((node) => classifyNode(node) === 'component');
  const supports = nodeRows.filter((node) => classifyNode(node) === 'support');
  const diagnostics = buildDiagnostics(state);

  const tabs = [
    ['pipes', 'Pipes', 'element-panel-tab-pipes'],
    ['fittings', 'Fittings', 'element-panel-tab-fittings'],
    ['components', 'Components', 'element-panel-tab-components'],
    ['supports', 'Supports', 'element-panel-tab-supports'],
    ['warnings', `Warnings (${diagnostics.length})`, 'element-panel-tab-warnings'],
  ];

  return (
    <div data-testid="sketcher-element-listing-panel" style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <strong style={{ color: '#e0f2fe' }}>Element Listing</strong>
          <QuickInsertButtons />
          {!collapsed && tabs.map(([id, label, testId]) => (
            <button key={id} type="button" data-testid={testId} style={tabButtonStyle(activeTab === id)} onClick={() => setActiveTab(id)}>
              {label}
            </button>
          ))}
        </div>
        <button type="button" data-testid="element-panel-collapse-toggle" style={actionButtonStyle} onClick={() => setCollapsed((value) => !value)}>
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>

      {!collapsed && (
        <div style={{ overflow: 'auto', maxHeight: '210px' }}>
          {activeTab === 'pipes' && (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>ID</th><th style={thStyle}>From</th><th style={thStyle}>To</th><th style={thStyle}>Length m</th><th style={thStyle}>Bore/DN</th><th style={thStyle}>Material</th><th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pipes.length === 0 && <EmptyRow colSpan={7} text="No pipe segments." />}
                {pipes.map((segment) => {
                  const len = segmentLength(nodes, segment);
                  const selected = state.selectedSegmentId === segment.id;
                  return (
                    <tr key={segment.id} style={{ background: selected ? '#1e3a8a55' : 'transparent' }}>
                      <td style={tdStyle}>{segment.id}</td>
                      <td style={tdStyle}>{segment.startNode}</td>
                      <td style={tdStyle}>{segment.endNode}</td>
                      <td style={tdStyle}>{len ? (len / 1000).toFixed(3) : '—'}</td>
                      <td style={tdStyle}>{segment.pipe?.dn ?? segment.properties?.bore ?? segment.bore ?? '—'}</td>
                      <td style={tdStyle}>{segment.pipe?.material ?? segment.properties?.material ?? segment.material ?? '—'}</td>
                      <td style={tdStyle}><button type="button" style={actionButtonStyle} onClick={() => state.setSelectedSegmentId(segment.id)}>Select</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {['fittings', 'components', 'supports'].includes(activeTab) && (
            <table style={tableStyle}>
              <thead>
                <tr><th style={thStyle}>Node</th><th style={thStyle}>Type</th><th style={thStyle}>X</th><th style={thStyle}>Y</th><th style={thStyle}>Z</th><th style={thStyle}>Action</th></tr>
              </thead>
              <tbody>
                {(activeTab === 'fittings' ? fittings : activeTab === 'components' ? components : supports).length === 0 && <EmptyRow text={`No ${activeTab}.`} />}
                {(activeTab === 'fittings' ? fittings : activeTab === 'components' ? components : supports).map((node) => {
                  const pos = node.pos || [0, 0, 0];
                  const selected = state.selectedNodeId === node.id;
                  return (
                    <tr key={node.id} style={{ background: selected ? '#1e3a8a55' : 'transparent' }}>
                      <td style={tdStyle}>{node.id}</td><td style={tdStyle}>{node.type || 'free'}</td>
                      <td style={tdStyle}>{Math.round(pos[0])}</td><td style={tdStyle}>{Math.round(pos[1])}</td><td style={tdStyle}>{Math.round(pos[2])}</td>
                      <td style={tdStyle}><button type="button" style={actionButtonStyle} onClick={() => state.setSelectedNodeId(node.id)}>Select</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeTab === 'warnings' && (
            <table style={tableStyle}>
              <thead><tr><th style={thStyle}>Severity</th><th style={thStyle}>Code</th><th style={thStyle}>Message</th></tr></thead>
              <tbody>
                {diagnostics.length === 0 && <EmptyRow colSpan={3} text="No diagnostics." />}
                {diagnostics.map((item, index) => (
                  <tr key={`${item.code || 'diagnostic'}-${index}`}>
                    <td style={tdStyle}>{item.severity || 'info'}</td>
                    <td style={tdStyle}>{item.code || 'DIAGNOSTIC'}</td>
                    <td style={{ ...tdStyle, whiteSpace: 'normal' }}>{item.message || String(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
