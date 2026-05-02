import React from 'react';
import { useAppStore } from '../store/appStore';
import { createEngineeringCalculationReport, renderMarkdownCalculationSheet } from './index';

export const ReportsTab = () => {
  const currentBenchmarkMock = useAppStore((state) => state.currentBenchmarkMock);
  const engineeringDefaults = useAppStore((state) => state.engineeringDefaults);
  const demoReport = createEngineeringCalculationReport({
    title: currentBenchmarkMock ? `Benchmark Report — ${currentBenchmarkMock.id}` : 'Engineering Calculation Sheet',
    module: currentBenchmarkMock?.module || 'not-selected',
    status: currentBenchmarkMock?.methodId === 'MIST_NOZZLE_SCREENING' ? 'NOT_QUALIFIED' : 'SCREENING_ONLY',
    methodId: currentBenchmarkMock?.methodId || 'SELECT_CALCULATION',
    formulaIds: currentBenchmarkMock?.methodId === 'MIST_NOZZLE_SCREENING' ? ['MIST_VENDOR_LOAD_SCREENING'] : ['REPORT_MARKDOWN_CALC_SHEET'],
    unitSystem: engineeringDefaults?.projectUnitSystem || 'imperial',
    benchmarkStatus: currentBenchmarkMock ? 'MOCK_LOADED' : 'NOT_RUN',
    warnings: [{ message: 'Reports are calculation-sheet style outputs and require checker review before issue.' }]
  });
  return (
    <div data-testid="reports-tab" style={{ padding: 24, color: '#fff', overflow: 'auto', height: '100%' }}>
      <h2 style={{ marginTop: 0 }}>Reports</h2>
      <p style={{ color: '#cbd5e1' }}>Reports include method ID, formula IDs, unit system, benchmark status, warnings, diagnostics, and reviewer/checker fields.</p>
      <pre data-testid="report-preview" style={{ background: '#020617', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 12, padding: 16, whiteSpace: 'pre-wrap' }}>
        {renderMarkdownCalculationSheet(demoReport)}
      </pre>
    </div>
  );
};
