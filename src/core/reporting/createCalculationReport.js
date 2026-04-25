import { VERSION_INFO } from '../../config/version.js';

const safeJson = (value) => JSON.stringify(value, null, 2);

export function createCalculationReport({ title = 'Calculation Report', module = 'unknown', input = null, result = null, diagnostics = [], notes = [] } = {}) {
  const generatedAt = new Date().toISOString();
  const warnings = [
    ...(Array.isArray(result?.warnings) ? result.warnings : []),
    ...(Array.isArray(diagnostics) ? diagnostics.filter((item) => item?.severity === 'warn' || item?.level === 'warn') : []),
  ];
  const assumptions = Array.isArray(result?.assumptions) ? result.assumptions : [];
  const formulaTrace = Array.isArray(result?.formulaTrace) ? result.formulaTrace : [];

  return {
    schemaVersion: 'calculation-report-v1',
    title,
    module,
    generatedAt,
    version: VERSION_INFO,
    summary: result?.summary || result?.meta || {},
    status: result?.status || result?.overallResult || result?.verdict || 'NOT_APPLICABLE',
    assumptions,
    warnings,
    formulaTrace,
    notes,
    input,
    result,
  };
}

export function reportToMarkdown(report = {}) {
  const lines = [];
  lines.push(`# ${report.title || 'Calculation Report'}`);
  lines.push('');
  lines.push(`- **Module:** ${report.module || 'unknown'}`);
  lines.push(`- **Generated:** ${report.generatedAt || ''}`);
  lines.push(`- **Version:** ${report.version?.appVersion || 'unknown'}`);
  lines.push(`- **Status:** ${report.status || 'NOT_APPLICABLE'}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('```json');
  lines.push(safeJson(report.summary || {}));
  lines.push('```');
  if (report.assumptions?.length) {
    lines.push('');
    lines.push('## Assumptions');
    report.assumptions.forEach((item) => lines.push(`- ${item}`));
  }
  if (report.warnings?.length) {
    lines.push('');
    lines.push('## Warnings');
    report.warnings.forEach((item) => lines.push(`- ${typeof item === 'string' ? item : item.message || safeJson(item)}`));
  }
  if (report.formulaTrace?.length) {
    lines.push('');
    lines.push('## Formula Trace');
    lines.push('```json');
    lines.push(safeJson(report.formulaTrace));
    lines.push('```');
  }
  lines.push('');
  lines.push('## Result JSON');
  lines.push('```json');
  lines.push(safeJson(report.result || {}));
  lines.push('```');
  return `${lines.join('\n')}\n`;
}
