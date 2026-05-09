import React, { useState } from 'react';
import { buildMasterDbGovernanceSummary } from '../core/engineering-data/validateMasterDbGovernance.js';
const button = { border: '1px solid #38bdf8', background: '#082f49', color: '#e0f2fe', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12 };
export default function MasterDbValidationPanel() {
  const [issueType, setIssueType] = useState('SCREENING_ISSUE');
  const [summary, setSummary] = useState(null);
  return (
    <div data-testid="master-db-validation-panel" style={{ border: '1px solid #334155', borderRadius: 8, padding: 10, marginTop: 12 }}>
      <div style={{ color: '#e0f2fe', fontWeight: 700, marginBottom: 8 }}>Master DB Validation Gates</div>
      <select data-testid="master-db-validation-issue-type" value={issueType} onChange={(e) => setIssueType(e.target.value)}><option value="SCREENING_ISSUE">Screening Issue</option><option value="FINAL_ISSUE">Final Issue</option></select>
      <button data-testid="master-db-run-validation" style={{ ...button, marginLeft: 8 }} onClick={() => setSummary(buildMasterDbGovernanceSummary({ issueType, validateWholeDb: true }))}>Run Validation</button>
      {summary && <div data-testid="master-db-validation-summary" style={{ marginTop: 8 }}><div>Status: {summary.status}</div><div>Component rows: {summary.counts.componentWeightRows}</div><div>Flange rows: {summary.counts.flangeDimensionalRows}</div><div>B16.9 rows: {summary.counts.b169FittingRows}</div><div>Errors: {summary.counts.errors}</div><ul data-testid="master-db-validation-diagnostics">{summary.diagnostics.slice(0,20).map((item,index)=><li key={`${item.code}-${index}`}>{item.severity} / {item.code}: {item.message}</li>)}</ul></div>}
    </div>
  );
}
