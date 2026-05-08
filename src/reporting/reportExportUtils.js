export function sanitizeFilename(value = '') {
  return String(value).replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').trim();
}

export function renderHtmlPrintCalculationSheet(report, markdown) {
  const title = report?.title || 'Engineering Calculation Sheet';
  const status = report?.status || 'UNKNOWN';
  const module = report?.module || '';
  const methodId = report?.methodId || '';
  const formulaIds = Array.isArray(report?.formulaIds) ? report.formulaIds.join(', ') : '';
  const unitSystem = report?.unitSystem || '';
  const benchmarkStatus = report?.benchmarkStatus || '';

  return `<!doctype html>
<html>
<head><title>${title}</title><style>body{font-family:monospace;padding:2em}pre{white-space:pre-wrap}@media print{button{display:none}}</style></head>
<body>
<h1>${title}</h1>
<table>
<tr><td><strong>Status</strong></td><td>${status}</td></tr>
<tr><td><strong>Module</strong></td><td>${module}</td></tr>
<tr><td><strong>Method ID</strong></td><td>${methodId}</td></tr>
<tr><td><strong>Formula IDs</strong></td><td>${formulaIds}</td></tr>
<tr><td><strong>Unit System</strong></td><td>${unitSystem}</td></tr>
<tr><td><strong>Benchmark Status</strong></td><td>${benchmarkStatus}</td></tr>
</table>
<hr/>
<pre>${markdown || ''}</pre>
</body>
</html>`;
}

export function makeDownloadableTextFile(filename, content, mimeType = 'text/plain') {
  return { filename, content, mimeType };
}

export function createReportExportBundle({ report, markdown, jsonSnapshot, revision } = {}) {
  const base = sanitizeFilename(report?.title || 'report').slice(0, 40);
  const seq = revision?.sequence || 1;

  return {
    markdown: makeDownloadableTextFile(`${base}-rev${seq}.md`, markdown || '', 'text/markdown'),
    json: makeDownloadableTextFile(`${base}-rev${seq}.json`, JSON.stringify({ revision, jsonSnapshot }, null, 2), 'application/json'),
    html: makeDownloadableTextFile(`${base}-rev${seq}.html`, renderHtmlPrintCalculationSheet(report, markdown), 'text/html'),
  };
}
