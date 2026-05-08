import React from 'react';

export default function TopologyDiagnosticsPanel({ diagnostics, lastCommand, summary, onClose }) {
  if (!diagnostics && !lastCommand) return null;

  const errorCount = summary?.errorCount ?? (diagnostics || []).filter(d => d.severity === 'error').length;
  const warnCount = summary?.warningCount ?? (diagnostics || []).filter(d => d.severity === 'warn').length;
  const status = errorCount === 0 ? 'PASSED' : 'ISSUES FOUND';

  return (
    <div data-testid="topology-diagnostics-panel" className="border rounded p-3 bg-yellow-50 text-sm mt-2">
      <div className="flex justify-between items-center mb-1">
        <strong data-testid="topology-diagnostics-summary">
          {lastCommand && <span>{lastCommand} — </span>}
          <span>{status}</span>
          {summary && (
            <span className="ml-2 text-gray-500">
              Nodes: {summary.nodeCount} | Segs: {summary.segmentCount} | Errors: {errorCount} | Warnings: {warnCount}
            </span>
          )}
        </strong>
        {onClose && (
          <button data-testid="topology-diagnostics-close" onClick={onClose} className="text-gray-500 hover:text-gray-800">✕</button>
        )}
      </div>
      {(!diagnostics || diagnostics.length === 0) ? (
        <div data-testid="topology-diagnostics-empty" className="text-green-600">No issues found.</div>
      ) : (
        <ul>
          {diagnostics.map((d, i) => (
            <li key={i} data-testid="topology-diagnostic-item" className={d.severity === 'error' ? 'text-red-600' : d.severity === 'warn' ? 'text-yellow-600' : 'text-gray-600'}>
              [{d.severity?.toUpperCase()}] {d.code}: {d.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
