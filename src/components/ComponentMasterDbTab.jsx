import React, { useState } from 'react';
import { DEFAULT_COMPONENT_MASTER_ROWS } from '../data/componentMasterDb/defaultComponentMasterDb.js';

export default function ComponentMasterDbTab() {
  const [rows, setRows] = useState(DEFAULT_COMPONENT_MASTER_ROWS);
  const [filter, setFilter] = useState('');

  const filteredRows = rows.filter(row =>
    !filter || JSON.stringify(row).toLowerCase().includes(filter.toLowerCase())
  );

  function addRow() {
    setRows(prev => [...prev, { id: `USER-${Date.now()}`, componentType: '', sourceStatus: 'USER_DEFINED', source: 'User defined' }]);
  }

  function updateRow(index, key, value) {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, [key]: value } : r));
  }

  function exportJson() {
    const content = JSON.stringify(rows, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'component-master-db.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    const keys = ['id', 'componentType', 'nps', 'branchNps', 'dn', 'branchDn', 'schedule', 'rating', 'c2e_in', 'runC2E_in', 'branchC2E_in', 'brlen_in', 'faceToFace_in', 'thickness_in', 'sourceStatus'];
    const csv = [keys.join(','), ...rows.map(r => keys.map(k => r[k] ?? '').join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'component-master-db.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div data-testid="component-master-db-tab" className="p-4">
      <h2 className="text-lg font-bold mb-2">Component Master DB</h2>
      <div data-testid="component-db-summary" className="mb-2 text-sm text-gray-600">
        {filteredRows.length} of {rows.length} component(s)
      </div>
      <div className="flex gap-2 mb-3">
        <input
          data-testid="component-db-filter"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter..."
          className="border px-2 py-1 text-sm flex-1"
        />
        <button data-testid="component-db-add-row" onClick={addRow} className="border px-2 py-1 text-sm">+ Add Row</button>
        <button data-testid="component-db-export-json" onClick={exportJson} className="border px-2 py-1 text-sm">Export JSON</button>
        <button data-testid="component-db-export-csv" onClick={exportCsv} className="border px-2 py-1 text-sm">Export CSV</button>
      </div>
      <div data-testid="component-db-table" className="overflow-x-auto">
        <table className="text-xs border-collapse w-full">
          <thead>
            <tr>{['id','componentType','nps','branchNps','dn','branchDn','schedule','rating','c2e_in','runC2E_in','branchC2E_in','brlen_in','faceToFace_in','thickness_in','sourceStatus'].map(k => (
              <th key={k} className="border px-1 py-0.5 bg-gray-100">{k}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filteredRows.map((row, i) => (
              <tr key={row.id || i}>
                {['id','componentType','nps','branchNps','dn','branchDn','schedule','rating','c2e_in','runC2E_in','branchC2E_in','brlen_in','faceToFace_in','thickness_in','sourceStatus'].map(k => (
                  <td key={k} data-testid={`component-db-cell-${k}`} className="border px-1 py-0.5">
                    <input
                      value={row[k] ?? ''}
                      onChange={e => updateRow(i, k, e.target.value)}
                      className="w-full text-xs"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
