export { reportSchema } from './reportSchema.js';
export { EngineeringReportBuilder } from './EngineeringReportBuilder.js';
export { exportJsonReport } from './exportJsonReport.js';
export { exportHtmlReport } from './exportHtmlReport.js';
import { getWorstStatus, isCriticalStatus } from '../engineering-methods/statusSeverity.js';

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().filter((key) => key !== 'generatedAt' && key !== 'timestamp').map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function stableHash(input) {
  const text = canonicalize(input);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function createEngineeringCalculationReport(payload = {}) {
  const rawStatus = payload.status || payload.calculationStatus || payload.result?.status || 'SCREENING_ONLY';
  const diagnosticStatuses = (payload.diagnostics || payload.result?.diagnostics || [])
    .map((diag) => diag.status)
    .filter(Boolean);
  const status = getWorstStatus([rawStatus, ...diagnosticStatuses]);
  const methodId = payload.methodId || payload.result?.methodId || 'UNKNOWN_METHOD';
  const formulaIds = payload.formulaIds || payload.result?.formulaIds || [];
  const unitSystem = payload.unitSystem || payload.result?.unitSystem || 'imperial';
  const diagnostics = payload.diagnostics || payload.result?.diagnostics || [];
  const warnings = payload.warnings || payload.result?.warnings || [];
  const benchmarkStatus = payload.benchmarkStatus || 'NOT_RUN';

  return {
    schemaVersion: 'calculation-report-v2',
    header: {
      title: payload.title || 'Engineering Calculation Sheet',
      module: payload.module || 'unknown',
      generatedAt: payload.generatedAt || new Date(0).toISOString()
    },
    calculationStatus: status,
    statusHeadline: makeStatusHeadline(status),
    scopeLimitations: payload.scopeLimitations || ['Simplified screening/design-aid calculation. Not for final stress/code compliance.'],
    inputTable: payload.inputs || payload.input || {},
    engineeringDataSource: payload.engineeringDataSource || {},
    unitSystem,
    methodId,
    formulaIds,
    formulaExpressions: payload.formulaExpressions || [],
    substitutionTable: payload.substitutions || {},
    resultTable: payload.results || payload.result || {},
    benchmarkStatus,
    warnings,
    diagnostics,
    reviewerChecker: payload.reviewerChecker || { preparedBy: '', checkedBy: '', approvedBy: '' }
  };
}

export function makeStatusHeadline(status) {
  if (status === 'PASSED') return 'PASSED — Screening Calculation Passed';
  if (status === 'SCREENING_ONLY') return 'SCREENING_ONLY — Not for final code compliance; requires engineer review';
  if (status === 'FAILED') return 'FAILED — Benchmark failed or result exceeded allowable';
  if (status === 'MISSING_DATA') return 'MISSING_DATA — Calculation Not Qualified';
  if (status === 'NOT_QUALIFIED') return 'NOT_QUALIFIED — Calculation Not Qualified';
  if (status === 'UNSUPPORTED_GEOMETRY') return 'UNSUPPORTED_GEOMETRY — Calculation Not Qualified';
  if (status === 'BENCHMARK_NOT_CERTIFIED') return 'BENCHMARK_NOT_CERTIFIED — Result Not Certified';
  return `${status || 'UNKNOWN'} — Calculation Not Qualified`;
}

export function createReportJsonSnapshot(payload = {}) {
  const report = createEngineeringCalculationReport(payload.reportPayload || payload);
  const hash = stableHash(report);
  return {
    moduleId: 'reporting',
    methodId: 'REPORT_DETERMINISTIC_JSON',
    formulaIds: ['REPORT_JSON_STABLE_HASH'],
    status: 'PASSED',
    stableHash: hash,
    timestampExcluded: true,
    report
  };
}

export function renderMarkdownCalculationSheet(report = {}) {
  const lines = [];
  lines.push(`# ${report.header?.title || 'Engineering Calculation Sheet'}`);
  lines.push('');
  lines.push(`## ${report.statusHeadline || makeStatusHeadline(report.calculationStatus)}`);
  lines.push('');
  lines.push(`Calculation status: ${report.calculationStatus || 'UNKNOWN'}`);
  lines.push(`Module: ${report.header?.module || 'unknown'}`);
  lines.push(`Unit system: ${report.unitSystem || 'unknown'}`);
  lines.push(`Method ID: ${report.methodId || 'UNKNOWN'}`);
  lines.push(`Formula ID(s): ${(report.formulaIds || []).join(', ')}`);
  lines.push(`Benchmark status: ${report.benchmarkStatus || 'NOT_RUN'}`);
  lines.push('');
  lines.push('## Scope / Limitations');
  (report.scopeLimitations || []).forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Input Table');
  lines.push('```json');
  lines.push(JSON.stringify(report.inputTable || {}, null, 2));
  lines.push('```');
  lines.push('');
  lines.push('## Engineering Data Source');
  lines.push('```json');
  lines.push(JSON.stringify(report.engineeringDataSource || {}, null, 2));
  lines.push('```');
  lines.push('');
  lines.push('## Formula Expression(s)');
  (report.formulaExpressions || []).forEach((item) => lines.push(`- ${item}`));
  lines.push('');
  lines.push('## Substitution Table');
  lines.push('```json');
  lines.push(JSON.stringify(report.substitutionTable || {}, null, 2));
  lines.push('```');
  lines.push('');
  lines.push('## Result Table');
  lines.push('```json');
  lines.push(JSON.stringify(report.resultTable || {}, null, 2));
  lines.push('```');
  lines.push('');
  lines.push('## Warnings / Diagnostics');
  [...(report.warnings || []), ...(report.diagnostics || [])].forEach((item) => {
    const text = typeof item === 'string' ? item : `${item.code ? `${item.code}: ` : ''}${item.message || JSON.stringify(item)}`;
    lines.push(`- ${text}`);
  });
  lines.push('');
  lines.push('## Reviewer / Checker');
  lines.push(`Prepared by: ${report.reviewerChecker?.preparedBy || ''}`);
  lines.push(`Checked by: ${report.reviewerChecker?.checkedBy || ''}`);
  lines.push(`Approved by: ${report.reviewerChecker?.approvedBy || ''}`);
  return `${lines.join('\n')}\n`;
}

function headlineHasCleanPassClaim(markdown) {
  const firstLines = markdown.split('\n').slice(0, 6).join('\n');
  return /\b(PASS|PASSED|ACCEPTABLE|CALCULATION OK)\b/i.test(firstLines);
}

export function createReportMarkdownCalcSheet(payload = {}) {
  const report = createEngineeringCalculationReport(payload.reportPayload || payload);
  const markdown = renderMarkdownCalculationSheet(report);
  const nonPassed = report.calculationStatus !== 'PASSED';
  return {
    moduleId: 'reporting',
    methodId: 'REPORT_MARKDOWN_CALC_SHEET',
    formulaIds: ['REPORT_MARKDOWN_CALC_SHEET'],
    status: report.calculationStatus,
    markdown,
    headline: report.statusHeadline,
    containsStatus: markdown.includes(report.calculationStatus),
    containsMethodId: markdown.includes(`Method ID: ${report.methodId}`),
    containsFormulaId: (report.formulaIds || []).every((id) => markdown.includes(id)),
    containsUnits: markdown.includes(`Unit system: ${report.unitSystem}`),
    containsWarnings: markdown.includes('Warnings / Diagnostics'),
    containsBenchmarkStatus: markdown.includes(`Benchmark status: ${report.benchmarkStatus}`),
    containsBlockingDiagnostic: (report.diagnostics || []).every((diag) => !diag.code || markdown.includes(diag.code)),
    noCleanPassClaim: nonPassed ? !headlineHasCleanPassClaim(markdown) : true,
    isCriticalStatus: isCriticalStatus(report.calculationStatus)
  };
}

export function createNotQualifiedReportHeadline(payload = {}) {
  const report = createEngineeringCalculationReport({ ...(payload.reportPayload || payload), status: 'NOT_QUALIFIED' });
  const headline = makeStatusHeadline(report.calculationStatus);
  return {
    moduleId: 'reporting',
    methodId: 'REPORT_MARKDOWN_CALC_SHEET',
    formulaIds: ['REPORT_MARKDOWN_CALC_SHEET'],
    status: 'NOT_QUALIFIED',
    headline,
    cleanPassClaim: false
  };
}
