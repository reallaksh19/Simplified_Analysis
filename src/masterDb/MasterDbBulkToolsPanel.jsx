import React, { useState } from 'react';
import { getMasterDbOverrides, replaceMasterDbOverrides } from '../data/masterDbOverrides.js';
import {
  buildMasterDbCoverageMatrix,
  parseAndValidateMasterDbImport,
  validateMasterDbBulkData,
} from '../data/masterDbBulkValidation.js';

const box = { border: '1px solid #334155', borderRadius: 8, padding: 10, marginTop: 12 };
const button = { border: '1px solid #38bdf8', background: '#082f49', color: '#e0f2fe', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12 };
const input = { background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', borderRadius: 4, padding: '6px 8px', fontSize: 12 };

export default function MasterDbBulkToolsPanel() {
  const [text, setText] = useState('');
  const [summary, setSummary] = useState(null);
  const [coverage, setCoverage] = useState(null);

  const validateCurrent = () => {
    const db = getMasterDbOverrides();
    setSummary(validateMasterDbBulkData(db));
    setCoverage(buildMasterDbCoverageMatrix(db));
  };

  const exportCurrent = () => {
    const db = getMasterDbOverrides();
    setText(JSON.stringify(db, null, 2));
    setSummary(validateMasterDbBulkData(db));
    setCoverage(buildMasterDbCoverageMatrix(db));
  };

  const validateImport = () => {
    const result = parseAndValidateMasterDbImport(text);
    setSummary(result.validation);
    setCoverage(result.coverage || null);
  };

  const importIfValid = () => {
    const result = parseAndValidateMasterDbImport(text);
    setSummary(result.validation);
    setCoverage(result.coverage || null);
    if (result.ok) replaceMasterDbOverrides(result.data);
  };

  return (
    <div data-testid="master-db-bulk-tools-panel" style={box}>
      <div style={{ color: '#e0f2fe', fontWeight: 700, marginBottom: 8 }}>Bulk Master DB Tools</div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <button data-testid="master-db-bulk-validate-current" style={button} onClick={validateCurrent}>Validate Current Overrides</button>
        <button data-testid="master-db-bulk-export-current" style={button} onClick={exportCurrent}>Export Current Overrides</button>
        <button data-testid="master-db-bulk-validate-import" style={button} onClick={validateImport}>Validate Import JSON</button>
        <button data-testid="master-db-bulk-import-if-valid" style={button} onClick={importIfValid}>Import If Valid</button>
      </div>

      <textarea
        data-testid="master-db-bulk-json-input"
        style={{ ...input, width: '100%', minHeight: 130, fontFamily: 'monospace' }}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />

      {summary && (
        <div data-testid="master-db-bulk-validation-summary" style={{ marginTop: 8 }}>
          <div>Status: {summary.status}</div>
          <div>Errors: {summary.counts?.errors ?? 0}</div>
          <div>Warnings: {summary.counts?.warnings ?? 0}</div>
          <ul data-testid="master-db-bulk-diagnostics">
            {(summary.diagnostics || []).slice(0, 20).map((item, index) => (
              <li key={`${item.code}-${index}`}>{item.severity} / {item.code}: {item.message}</li>
            ))}
          </ul>
        </div>
      )}

      {coverage && (
        <div data-testid="master-db-bulk-coverage-summary" style={{ marginTop: 8 }}>
          DN values: {coverage.dnValues.length} | Rating classes: {coverage.ratingClasses.length}
        </div>
      )}
    </div>
  );
}
