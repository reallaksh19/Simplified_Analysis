/**
 * Functionality: provides the operator UI for support-load calculation inside
 * the Calculation Workspace. Parameters: imported workspace, support-load model,
 * editable formula profile, and selected object id. Outputs: input preview,
 * factor controls, equation view, result table, and calculation logs. Fallback:
 * empty states show import/selection guidance without fabricating data.
 */

import React, { useMemo, useState } from 'react';
import { RefreshCw, RotateCcw } from 'lucide-react';
import { resultRows } from './supportLoadEngine.js';
import { useCalculationWorkspaceStore } from './useCalculationWorkspaceStore.js';
import './WorkspaceLoadCalculationPanel.css';

const PANEL_TABS = Object.freeze(['Preview', 'Factors', 'Equations', 'Logs']);
const FACTOR_GROUPS = Object.freeze([
  {
    title: 'Vertical',
    fields: [
      { key: 'gravityFactor', label: 'Gravity' },
      { key: 'verticalLoadFactor', label: 'Load factor' },
    ],
  },
  {
    title: 'Rounding',
    fields: [
      { key: 'roundMajor', label: 'Major' },
      { key: 'roundStep', label: 'Step' },
    ],
  },
  {
    title: 'Guide',
    fields: [
      { key: 'guideTemperatureMultiplier', label: 'Temp multiplier' },
      { key: 'guideSpanLoadMultiplier', label: 'Span multiplier' },
      { key: 'guideWallReferenceMm', label: 'Wall ref mm' },
      { key: 'guideTempDivisor', label: 'Temp divisor' },
      { key: 'guideDivisor', label: 'Divisor' },
      { key: 'guideMinimumOpeVerticalFactor', label: 'Min OPE factor' },
    ],
  },
  {
    title: 'Line Stop',
    fields: [
      { key: 'lineStopScale', label: 'Scale' },
      { key: 'lineStopCoefficient', label: 'Coefficient' },
      { key: 'lineStopPi', label: 'Pi' },
      { key: 'lineStopSectionDivisor', label: 'Section divisor' },
      { key: 'lineStopExponent', label: 'Exponent' },
      { key: 'lineStopTempDivisor', label: 'Temp divisor' },
      { key: 'lineStopDivisor', label: 'Divisor' },
    ],
  },
]);

export default function WorkspaceLoadCalculationPanel() {
  const workspace = useCalculationWorkspaceStore((state) => state.workspace);
  const supportLoad = useCalculationWorkspaceStore((state) => state.supportLoad);
  const supportLoadProfile = useCalculationWorkspaceStore((state) => state.supportLoadProfile);
  const selectedObjectId = useCalculationWorkspaceStore((state) => state.selectedObjectId);
  const setSupportLoadProfileValue = useCalculationWorkspaceStore((state) => state.setSupportLoadProfileValue);
  const resetSupportLoadProfile = useCalculationWorkspaceStore((state) => state.resetSupportLoadProfile);
  const rebuildSupportLoads = useCalculationWorkspaceStore((state) => state.rebuildSupportLoads);
  const selectObject = useCalculationWorkspaceStore((state) => state.selectObject);
  const [activePanel, setActivePanel] = useState('Preview');
  const rows = useMemo(() => resultRows(supportLoad), [supportLoad]);
  const selectedRow = selectedObjectId ? rows.find((row) => row.pipeId === selectedObjectId) : null;
  const summary = supportLoad?.summary || {};

  return (
    <section className="cw-load-panel">
      <header className="cw-load-panel-head">
        <div>
          <h2>Load Calculation</h2>
          <p>Support-load inputs, factors, equations, and calculation logs from imported workspace data.</p>
        </div>
        <div className="cw-load-actions">
          <button type="button" onClick={rebuildSupportLoads} disabled={!workspace}><RefreshCw size={14} /> Run</button>
          <button type="button" onClick={resetSupportLoadProfile}><RotateCcw size={14} /> Defaults</button>
        </div>
      </header>
      <nav className="cw-load-tabs">
        {PANEL_TABS.map((tab) => (
          <button type="button" key={tab} className={activePanel === tab ? 'is-active' : ''} onClick={() => setActivePanel(tab)}>
            {tab}
          </button>
        ))}
      </nav>
      <section className="cw-load-summary">
        {metric('Pipes', summary.pipes)}
        {metric('Ready vertical', summary.readyVertical)}
        {metric('Ready guide', summary.readyGuide)}
        {metric('Ready line stop', summary.readyLineStop)}
        {metric('Calculated', summary.calculated)}
        {metric('Blocked', summary.blocked)}
      </section>
      {activePanel === 'Preview' && (
        <PreviewPanel
          rows={rows}
          selectedObjectId={selectedObjectId}
          selectedRow={selectedRow}
          selectObject={selectObject}
        />
      )}
      {activePanel === 'Factors' && <FactorsPanel profile={supportLoadProfile} setProfileValue={setSupportLoadProfileValue} />}
      {activePanel === 'Equations' && <EquationsPanel supportLoad={supportLoad} />}
      {activePanel === 'Logs' && <LogsPanel supportLoad={supportLoad} />}
    </section>
  );
}

function PreviewPanel({ rows, selectedObjectId, selectedRow, selectObject }) {
  return (
    <div className="cw-load-grid">
      <section className="cw-load-card">
        <h3>Selected Pipe Preview</h3>
        {selectedRow ? (
          <div className="cw-load-kv">
            {kv('Pipe', selectedRow.pipeId)}
            {kv('Line', selectedRow.lineNo)}
            {kv('NPS / OD', `${dash(selectedRow.nps)} / ${dash(selectedRow.od)}`)}
            {kv('Wall', selectedRow.wall)}
            {kv('Pipe kg/m', selectedRow.unitPipeWtKgPerM)}
            {kv('Insulation kg/m', selectedRow.insulationWtKgPerM)}
            {kv('Component kg', selectedRow.lumpWeightKg)}
            {kv('Fluid OPE kg/m', selectedRow.fluidWtOpeKgPerM)}
            {kv('Temp T1 °C', selectedRow.tempExpC1)}
            {kv('Auto / DEP span', `${dash(selectedRow.autoSpanMm)} / ${dash(selectedRow.depSpanMm)}`)}
            {kv('Status', selectedRow.status)}
          </div>
        ) : (
          <div className="cw-load-empty">Select a calculated pipe row to preview its input and output.</div>
        )}
      </section>
      <section className="cw-load-card cw-load-table-card">
        <h3>Result Rows</h3>
        <ResultTable rows={rows} selectedObjectId={selectedObjectId} selectObject={selectObject} />
      </section>
    </div>
  );
}

function FactorsPanel({ profile, setProfileValue }) {
  return (
    <section className="cw-load-card">
      <h3>Access Profile Factors</h3>
      <div className="cw-factor-groups">
        {FACTOR_GROUPS.map((group) => (
          <fieldset key={group.title}>
            <legend>{group.title}</legend>
            <div className="cw-factor-grid">
              {group.fields.map((field) => (
                <label key={field.key}>
                  <span>{field.label}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={profile?.[field.key] ?? ''}
                    onChange={(event) => setProfileValue(field.key, event.target.value)}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <fieldset>
          <legend>Expression</legend>
          <label className="cw-factor-wide">
            <span>Line-stop inside diameter</span>
            <select value={profile?.lineStopIdExpression || 'D_MINUS_WT'} onChange={(event) => setProfileValue('lineStopIdExpression', event.target.value)}>
              <option value="D_MINUS_WT">Dia - WALL_THICK</option>
              <option value="D_MINUS_2WT">Dia - 2 * WALL_THICK</option>
            </select>
          </label>
        </fieldset>
      </div>
    </section>
  );
}

function EquationsPanel({ supportLoad }) {
  const text = supportLoad?.formulaText || 'Import a workspace package to view formulas.';
  return (
    <section className="cw-load-card">
      <h3>Equations</h3>
      <pre className="cw-equation-box">{text}</pre>
    </section>
  );
}

function LogsPanel({ supportLoad }) {
  const logs = Array.isArray(supportLoad?.logs) ? supportLoad.logs : [];
  return (
    <section className="cw-load-card">
      <h3>Calculation Logs</h3>
      {!logs.length && <div className="cw-load-empty">No calculation logs yet.</div>}
      <div className="cw-log-list">
        {logs.map((row, index) => (
          <div className={`cw-log-row level-${row.level || 'info'}`} key={`${row.message}-${index}`}>
            <span>{row.level || 'info'}</span>
            <strong>{row.message}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResultTable({ rows, selectedObjectId, selectObject }) {
  if (!rows.length) return <div className="cw-load-empty">No support-load inputs built from the current workspace.</div>;
  return (
    <div className="cw-load-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Pipe</th>
            <th>Line</th>
            <th>OPE_V_A</th>
            <th>OPE_V_DEP</th>
            <th>Guide_H_A</th>
            <th>LineStop_H</th>
            <th>Status</th>
            <th>Missing</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.pipeId}
              className={selectedObjectId === row.pipeId ? 'is-selected' : ''}
              onClick={() => selectObject(row.pipeId)}
            >
              <td>{row.pipeId}</td>
              <td>{row.lineNo || '-'}</td>
              <td>{dash(row.verticalNA)}</td>
              <td>{dash(row.verticalNDep)}</td>
              <td>{dash(row.guideHA)}</td>
              <td>{dash(row.lineStopH)}</td>
              <td>{row.status}</td>
              <td>{Array.isArray(row.missing) ? row.missing.join(', ') : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function metric(label, value) {
  return (
    <div className="cw-load-metric" key={label}>
      <span>{label}</span>
      <strong>{dash(value)}</strong>
    </div>
  );
}

function kv(label, value) {
  return (
    <div key={label}>
      <span>{label}</span>
      <strong>{dash(value)}</strong>
    </div>
  );
}

function dash(value) {
  if (value === null || value === undefined || value === '') return '-';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return String(Math.round(numeric * 1000) / 1000);
}
