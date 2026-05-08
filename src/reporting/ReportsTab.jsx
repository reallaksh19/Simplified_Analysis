import React from 'react';
import { useAppStore } from '../store/appStore';
import { createEngineeringCalculationReport, renderMarkdownCalculationSheet } from './index';
import { buildReportPayload } from './buildReportPayload.js';

export const ReportsTab = () => {
  const activeReportContext = useAppStore((state) => state.activeReportContext);
  const resultsStale = useAppStore((state) => state.resultsStale);
  const currentBenchmarkMock = useAppStore((state) => state.currentBenchmarkMock);
  const engineeringDefaults = useAppStore((state) => state.engineeringDefaults);

  // If no active report context, show placeholder
  if (!activeReportContext) {
    return (
      <div data-testid="reports-tab" style={{ padding: 24, color: '#fff', overflow: 'auto', height: '100%' }}>
        <h2 style={{ marginTop: 0 }}>Reports</h2>
        <div data-testid="no-active-report" style={{ color: '#cbd5e1', marginTop: 16 }}>
          No active calculation report is available. Run a calculation first.
        </div>
      </div>
    );
  }

  // Build report payload from active context
  const reportPayload = buildReportPayload(activeReportContext, resultsStale);
  const report = createEngineeringCalculationReport(reportPayload);

  return (
    <div data-testid="reports-tab" style={{ padding: 24, color: '#fff', overflow: 'auto', height: '100%' }}>
      <h2 style={{ marginTop: 0 }}>Reports</h2>
      {resultsStale && (
        <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          STALE — Recalculate before issue.
        </div>
      )}
      <p style={{ color: '#cbd5e1' }}>Reports include method ID, formula IDs, unit system, benchmark status, warnings, diagnostics, and reviewer/checker fields.</p>
      <pre data-testid="report-preview" style={{ background: '#020617', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 12, padding: 16, whiteSpace: 'pre-wrap' }}>
        {renderMarkdownCalculationSheet(report)}
      </pre>
    </div>
  );
};
