export function exportHtmlReport(report) {
  const css = `
    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
    h1, h2, h3 { color: #333; }
    .warning { color: #d9534f; font-weight: bold; }
    .limitation { background-color: #fcf8e3; border-left: 5px solid #faebcc; padding: 10px; margin-bottom: 20px; font-weight: bold; }
    pre { background-color: #f4f4f4; padding: 10px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
  `;

  let html = `<!DOCTYPE html>
<html>
<head>
<title>Engineering Report</title>
<style>${css}</style>
</head>
<body>
`;

  html += `<div class="limitation">${report.engineeringLimitationNote}</div>\n`;

  html += `<h1>Calculation Report</h1>\n`;
  html += `<p><strong>Calculation Method:</strong> ${report.calculationMethod}</p>\n`;
  html += `<p><strong>Input Source:</strong> ${report.inputSource}</p>\n`;

  if (Object.keys(report.projectInfo).length > 0) {
    html += `<h2>Project Information</h2><ul>`;
    for (const [key, val] of Object.entries(report.projectInfo)) {
       html += `<li><strong>${key}:</strong> ${val}</li>`;
    }
    html += `</ul>\n`;
  }

  if (Object.keys(report.geometrySummary).length > 0) {
    html += `<h2>Geometry Summary</h2><pre>${JSON.stringify(report.geometrySummary, null, 2)}</pre>\n`;
  }

  if (Object.keys(report.pipeProperties).length > 0) {
    html += `<h2>Pipe Properties</h2><pre>${JSON.stringify(report.pipeProperties, null, 2)}</pre>\n`;
  }

  if (Object.keys(report.boundaryConditions).length > 0) {
    html += `<h2>Boundary Conditions</h2><pre>${JSON.stringify(report.boundaryConditions, null, 2)}</pre>\n`;
  }

  if (Object.keys(report.loads).length > 0) {
    html += `<h2>Loads</h2><pre>${JSON.stringify(report.loads, null, 2)}</pre>\n`;
  }

  html += `<h2>Results</h2><pre>${JSON.stringify(report.results, null, 2)}</pre>\n`;

  if (report.warnings && report.warnings.length > 0) {
    html += `<h2>Warnings</h2><ul>`;
    report.warnings.forEach(w => {
      html += `<li class="warning">${w.code ? w.code + ': ' : ''}${w.message || w}</li>`;
    });
    html += `</ul>\n`;
  }

  if (report.assumptions && report.assumptions.length > 0) {
    html += `<h2>Assumptions</h2><ul>`;
    report.assumptions.forEach(a => html += `<li>${a}</li>`);
    html += `</ul>\n`;
  }

  if (report.formulas && report.formulas.length > 0) {
    html += `<h2>Formulas</h2><ul>`;
    report.formulas.forEach(f => html += `<li>${f}</li>`);
    html += `</ul>\n`;
  }

  html += `<h2>Appendix (Raw Geometry)</h2><pre>${JSON.stringify(report.appendix, null, 2)}</pre>\n`;

  html += `</body></html>`;
  return html;
}
