import { useAppStore } from '../store/appStore.js';

function normalizeFormulaIds(result = {}) {
  if (Array.isArray(result.formulaIds)) return result.formulaIds;
  if (Array.isArray(result.results?.formulaIds)) return result.results.formulaIds;
  return [];
}

function normalizeMethodId(result = {}, fallback = 'UNKNOWN_METHOD') {
  return result.methodId || result.results?.methodId || fallback;
}

function normalizeDiagnostics(result = {}) {
  return [
    ...(Array.isArray(result.diagnostics) ? result.diagnostics : []),
    ...(Array.isArray(result.dataStatus?.diagnostics) ? result.dataStatus.diagnostics : []),
  ];
}

export function buildActiveReportContext({
  moduleId,
  title,
  input,
  result,
  settings,
  settingsHash,
  benchmarkStatus = 'NOT_RUN',
  fallbackMethodId = 'UNKNOWN_METHOD',
} = {}) {
  const resolved = useAppStore.getState().getResolvedEngineeringSettings?.()
    || useAppStore.getState().resolvedEngineeringSettings;

  const effectiveSettings = settings || resolved?.settings || {};
  const effectiveSettingsHash = settingsHash || resolved?.settingsHash || null;
  const formulaIds = normalizeFormulaIds(result);

  return {
    schemaVersion: 'active-report-context-v1',
    moduleId: moduleId || result?.moduleId || 'unknown-module',
    methodId: normalizeMethodId(result, fallbackMethodId),
    title: title || `${moduleId || 'Calculation'} — ${normalizeMethodId(result, fallbackMethodId)}`,
    input: input || {},
    result: {
      ...result,
      formulaIds,
      methodId: normalizeMethodId(result, fallbackMethodId),
    },
    settings: effectiveSettings,
    settingsHash: effectiveSettingsHash,
    diagnostics: normalizeDiagnostics(result),
    warnings: result?.warnings || [],
    benchmarkStatus,
  };
}

export function publishActiveReportContext(payload = {}) {
  const context = buildActiveReportContext(payload);
  useAppStore.getState().setActiveReportContext(context);
  return context;
}
