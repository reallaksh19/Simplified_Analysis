import { VERSION_INFO } from '../../config/version.js';
import {
  createEngineeringCalculationReport,
  renderMarkdownCalculationSheet
} from '../../reporting/index.js';

const safeJson = (value) => JSON.stringify(value, null, 2);

function normaliseLegacyStatus(result = {}) {
  return result?.status || result?.overallResult || result?.verdict || result?.calculationStatus || 'SCREENING_ONLY';
}

function inferMethodId(module, result = {}) {
  if (result?.methodId) return result.methodId;
  if (module === 'piperack') return result?.methodologyUsed ? 'PIPERACK_LOOP_ORDER' : 'PIPERACK_LOOP_ORDER';
  return 'UNKNOWN_METHOD';
}

function inferFormulaIds(module, result = {}) {
  if (Array.isArray(result?.formulaIds) && result.formulaIds.length) return result.formulaIds;
  if (module === 'piperack') return ['PIPERACK_LOOP_REQUIRED_LEG'];
  if (Array.isArray(result?.formulaTrace) && result.formulaTrace.length) return result.formulaTrace.map((item, index) => item.formulaId || item.id || `LEGACY_FORMULA_${index + 1}`);
  return ['REPORT_MARKDOWN_CALC_SHEET'];
}

/**
 * Legacy report API routed through the v2 engineering report generator.
 * This preserves older callers such as RackResultsGrid while ensuring exports
 * include worst-status headline, methodId, formulaIds, unitSystem, diagnostics,
 * benchmark status, and reviewer/checker structure.
 */
export function createCalculationReport({
  title = 'Calculation Report',
  module = 'unknown',
  input = null,
  result = null,
  diagnostics = [],
  notes = []
} = {}) {
  const warnings = [
    ...(Array.isArray(result?.warnings) ? result.warnings : []),
    ...(Array.isArray(diagnostics) ? diagnostics.filter((item) => item?.severity === 'warn' || item?.severity === 'WARNING' || item?.level === 'warn') : [])
  ];
  const allDiagnostics = [
    ...(Array.isArray(result?.diagnostics) ? result.diagnostics : []),
    ...(Array.isArray(diagnostics) ? diagnostics : [])
  ];

  const report = createEngineeringCalculationReport({
    title,
    module,
    status: normaliseLegacyStatus(result || {}),
    methodId: inferMethodId(module, result || {}),
    formulaIds: inferFormulaIds(module, result || {}),
    unitSystem: result?.unitSystem || 'imperial',
    benchmarkStatus: result?.benchmarkStatus || 'NOT_RUN',
    input,
    result,
    diagnostics: allDiagnostics,
    warnings,
    notes,
    engineeringDataSource: result?.engineeringDataSource || result?.dataSource || {},
    formulaExpressions: result?.formulaExpressions || result?.formulas || result?.formulaTrace || [],
    substitutions: result?.substitutions || {},
    reviewerChecker: result?.reviewerChecker || { preparedBy: '', checkedBy: '', approvedBy: '' }
  });

  return {
    ...report,
    legacySchemaVersion: 'calculation-report-v1-compat',
    version: VERSION_INFO,
    summary: result?.summary || result?.meta || {},
    assumptions: Array.isArray(result?.assumptions) ? result.assumptions : [],
    notes,
    input,
    result
  };
}

export function reportToMarkdown(report = {}) {
  if (report?.schemaVersion === 'calculation-report-v2') return renderMarkdownCalculationSheet(report);
  const v2Report = createEngineeringCalculationReport(report || {});
  return `${renderMarkdownCalculationSheet(v2Report)}\n## Legacy JSON\n\n\`\`\`json\n${safeJson(report || {})}\n\`\`\`\n`;
}
