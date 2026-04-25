import { reportToMarkdown } from './createCalculationReport.js';

export function exportMarkdownReport(report, fileName = 'calculation-report.md') {
  const text = reportToMarkdown(report);
  if (typeof document === 'undefined') return text;
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  return text;
}
