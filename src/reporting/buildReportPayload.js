export function buildReportPayload(activeReportContext, resultsStale) {
  const result = activeReportContext?.result || {};
  const status = resultsStale
    ? 'SCREENING_ONLY'
    : (result.status || result.calculationStatus || 'SCREENING_ONLY');

  return {
    title: activeReportContext?.title || 'Engineering Calculation Sheet',
    module: activeReportContext?.moduleId || 'unknown-module',
    status,
    methodId: activeReportContext?.methodId || result.methodId || 'UNKNOWN_METHOD',
    formulaIds: result.formulaIds || [],
    unitSystem: result.unitSystem || activeReportContext?.settings?.projectUnitSystem || 'imperial',
    benchmarkStatus: activeReportContext?.benchmarkStatus || 'NOT_RUN',
    input: activeReportContext?.input || {},
    result,
    settings: activeReportContext?.settings || {},
    settingsHash: activeReportContext?.settingsHash || null,
    engineeringDataSource: result.dataStatus || result.engineeringDataSource || {},
    warnings: [
      ...(activeReportContext?.warnings || []),
      ...(resultsStale ? [{ code: 'STALE_RESULTS', message: 'STALE — Recalculate before issue.' }] : []),
    ],
    diagnostics: activeReportContext?.diagnostics || [],
    substitutions: {
      settingsHash: activeReportContext?.settingsHash || null,
      createdSequence: activeReportContext?.createdSequence || null,
    },
  };
}
