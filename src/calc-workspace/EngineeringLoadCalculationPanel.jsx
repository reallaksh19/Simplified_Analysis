/**
 * Functionality: presents diagnostic-first vertical load calculations with
 * visible configuration, element weights, split OPE/HYD COG, support
 * capability, chainage distribution, and formula trace. Parameters: workspace
 * store state/actions. Outputs: interactive engineering review UI. Fallback:
 * blocked values render as dashes plus diagnostics, never as valid zeroes.
 */

import React, { useMemo, useState } from 'react';
import { Info, RefreshCw } from 'lucide-react';
import { ENGINEERING_LOAD_CONFIG_INFO } from './engineering-loads/engines/engineeringLoadEngine.js';
import { useCalculationWorkspaceStore } from './useCalculationWorkspaceStore.js';
import './WorkspaceLoadCalculationPanel.css';

const TABS = Object.freeze(['Data Health', 'Element Weight', 'COG', 'Support Capability', 'Distribution', 'Formula Trace', 'Config']);

export function EngineeringLoadCalculationPanel() {
  const workspace = useCalculationWorkspaceStore((state) => state.workspace);
  const distribution = useCalculationWorkspaceStore((state) => state.supportLoadDistribution);
  const profile = useCalculationWorkspaceStore((state) => state.supportLoadProfile);
  const rebuild = useCalculationWorkspaceStore((state) => state.rebuildSupportLoads);
  const setProfile = useCalculationWorkspaceStore((state) => state.setSupportLoadProfileValue);
  const selectedObjectId = useCalculationWorkspaceStore((state) => state.selectedObjectId);
  const selectObject = useCalculationWorkspaceStore((state) => state.selectObject);
  const [activeTab, setActiveTab] = useState('Data Health');
  const info = useMemo(() => visibleConfigInfo(profile), [profile]);
  return (
    <section className="cw-load-panel">
      <Header workspace={workspace} rebuild={rebuild} info={info} />
      <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
      <Summary distribution={distribution} />
      {activeTab === 'Data Health' && <DataHealth distribution={distribution} />}
      {activeTab === 'Element Weight' && <ElementWeights distribution={distribution} selectedObjectId={selectedObjectId} selectObject={selectObject} />}
      {activeTab === 'COG' && <CogPanel distribution={distribution} />}
      {activeTab === 'Support Capability' && <SupportCapability distribution={distribution} />}
      {activeTab === 'Distribution' && <DistributionPanel distribution={distribution} />}
      {activeTab === 'Formula Trace' && <FormulaTrace distribution={distribution} selectedObjectId={selectedObjectId} />}
      {activeTab === 'Config' && <VisibleConfig profile={profile} setProfile={setProfile} />}
    </section>
  );
}

function Header({ workspace, rebuild, info }) {
  return (
    <header className="cw-load-panel-head">
      <div><h2>Engineering Load Calculation</h2><p>Diagnostic-first OPE/HYD element weights and chainage tributary support reactions.</p></div>
      <div className="cw-load-actions">
        <button type="button" title={info} aria-label={info}><Info size={14} /> i</button>
        <button type="button" onClick={rebuild} disabled={!workspace}><RefreshCw size={14} /> Run</button>
      </div>
    </header>
  );
}

function TabBar({ activeTab, setActiveTab }) {
  return <nav className="cw-load-tabs">{TABS.map((tab) => <button type="button" key={tab} className={activeTab === tab ? 'is-active' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>)}</nav>;
}

function Summary({ distribution }) {
  const totals = distribution?.totals || {};
  return <section className="cw-load-summary">{metric('Elements', totals.elements)}{metric('Supports', totals.supports)}{metric('OPE kg', totals.distributedWeightOpeKg)}{metric('HYD kg', totals.distributedWeightHydKg)}{metric('Unsupported OPE', totals.unsupportedWeightOpeKg)}{metric('Blocked', distribution?.diagnosticSummary?.blocked)}</section>;
}

function DataHealth({ distribution }) {
  if (!distribution) return <Panel title="Data Health"><Empty text="Import enriched SelJson to evaluate calculation readiness." /></Panel>;
  const diagnostics = distribution?.diagnostics || [];
  return <Panel title={`Issues (${diagnostics.length})`}>{!diagnostics.length ? <Empty text="All required benchmark inputs are available." /> : <Table headers={['Badge', 'Severity', 'Field', 'Message']} rows={diagnostics.map((row) => [row.ui?.badge, row.severity, row.field, row.message])} />}</Panel>;
}

function ElementWeights({ distribution, selectedObjectId, selectObject }) {
  const rows = distribution?.elements || [];
  return <Panel title="Element weight table"><div className="cw-load-table-wrap"><table><thead><tr><th>Element</th><th>Type</th><th>OPE kg</th><th>HYD kg</th><th>Component kg</th><th>Issues</th></tr></thead><tbody>{rows.map((row) => <tr key={row.elementId} className={selectedObjectId === row.elementId ? 'is-selected' : ''} onClick={() => selectObject(row.elementId)}><td>{row.name}</td><td>{row.type}</td><td>{dash(row.totalWeightOpeKg)}</td><td>{dash(row.totalWeightHydKg)}</td><td>{dash(row.componentWeightKg)}</td><td>{row.diagnostics.length}</td></tr>)}</tbody></table></div></Panel>;
}

function CogPanel({ distribution }) {
  const totals = distribution?.totals || {};
  const excludedOpe = (distribution?.elements || []).filter((row) => row.totalWeightOpeKg === null);
  const excludedHyd = (distribution?.elements || []).filter((row) => row.totalWeightHydKg === null);
  return <div className="cw-load-grid"><Panel title="Load-case COG"><KeyValues rows={[['OPE COG', pointText(totals.cogOpe)], ['HYD COG', pointText(totals.cogHyd)], ['OPE valid kg', totals.totalWeightOpeKg], ['HYD valid kg', totals.totalWeightHydKg]]} /></Panel><Panel title="Excluded elements"><KeyValues rows={[['OPE excluded', names(excludedOpe)], ['HYD excluded', names(excludedHyd)]]} /></Panel></div>;
}

function SupportCapability({ distribution }) {
  const supports = distribution?.supports || [];
  return <Panel title="Explicit vertical capability"><Table headers={['Support', 'Type', 'Chainage mm', 'Vertical capability', 'Issues']} rows={supports.map((row) => [row.name, row.supportType, row.chainageMm, row.verticalCapability === true ? 'YES' : 'BLOCKED', row.diagnostics?.length || 0])} /></Panel>;
}

function DistributionPanel({ distribution }) {
  const rows = distribution?.supports || [];
  return <Panel title={`${distribution?.method || 'CHAINAGE_TRIBUTARY_SPAN_V2'} - engineering target`}><Table headers={['Support', 'OPE kg', 'OPE N', 'HYD kg', 'HYD N', 'Contributions']} rows={rows.map((row) => [row.name, row.verticalLoadOpeKg, row.verticalLoadOpeN, row.verticalLoadHydKg, row.verticalLoadHydN, row.contributionCount])} /></Panel>;
}

function FormulaTrace({ distribution, selectedObjectId }) {
  const elements = distribution?.elements || [];
  const selected = elements.find((row) => row.elementId === selectedObjectId) || elements[0];
  if (!selected) return <Empty text="No element formula trace is available." />;
  const rows = Object.entries(selected.formulaTrace || {}).map(([key, value]) => [key, value.status, value.source, value.trace?.formula || '-', value.value]);
  return <Panel title={`Formula trace: ${selected.name}`}><Table headers={['Term', 'Status', 'Source', 'Formula', 'Result kg/m or kg']} rows={rows} /></Panel>;
}

function VisibleConfig({ profile, setProfile }) {
  const entries = Object.entries(profile || {}).filter(([, value]) => typeof value === 'number');
  return <Panel title="Visible editable configuration"><p className="cw-load-empty">Every value below is active configuration. No hidden engineering default is applied.</p><div className="cw-factor-grid">{entries.map(([key, value]) => <label key={key}><span>{key}</span><input type="number" step="any" value={value} onChange={(event) => setProfile(key, event.target.value)} /></label>)}<label><span>lineStopIdExpression</span><select value={profile?.lineStopIdExpression} onChange={(event) => setProfile('lineStopIdExpression', event.target.value)}><option value="D_MINUS_2WT">D - 2 × WT</option><option value="D_MINUS_WT">D - WT</option></select></label><label><span>roundMode</span><select value={profile?.roundMode} onChange={(event) => setProfile('roundMode', event.target.value)}><option value="up">Up</option><option value="nearest">Nearest</option><option value="down">Down</option></select></label></div><KeyValues rows={[['configSource', profile?.configSource], ['Distribution', 'CHAINAGE_TRIBUTARY_SPAN_V2'], ['V1 status', 'NEAREST_TWO_SUPPORT_LEVER_V1 - SCREENING ONLY, not auto-selected']]} /></Panel>;
}

function Panel({ title, children }) { return <section className="cw-load-card cw-load-table-card"><h3>{title}</h3>{children}</section>; }
function Empty({ text }) { return <div className="cw-load-empty">{text}</div>; }
function Table({ headers, rows }) { return <div className="cw-load-table-wrap"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row[0]}-${index}`}>{row.map((value, cell) => <td key={`${index}-${cell}`}>{dash(value)}</td>)}</tr>)}</tbody></table></div>; }
function KeyValues({ rows }) { return <div className="cw-load-kv">{rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{dash(value)}</strong></div>)}</div>; }
function metric(label, value) { return <div className="cw-load-metric" key={label}><span>{label}</span><strong>{dash(value)}</strong></div>; }
function pointText(point) { return point ? `${point.x}, ${point.y}, ${point.z}` : null; }
function names(rows) { return rows.length ? rows.map((row) => row.name).join(', ') : 'None'; }
function dash(value) { if (value === null || value === undefined || value === '') return '-'; const numeric = Number(value); return Number.isFinite(numeric) ? String(Math.round(numeric * 1e6) / 1e6) : String(value); }
function visibleConfigInfo(profile) { const fields = Object.entries(profile || {}).map(([key, value]) => `${key} = ${value}`); return `${ENGINEERING_LOAD_CONFIG_INFO}\n\nActive visible profile:\n${fields.join('\n')}`; }
