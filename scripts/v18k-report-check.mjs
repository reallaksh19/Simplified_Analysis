import fs from 'node:fs';
function fail(message){ console.error(`V18K check failed: ${message}`); process.exit(1); }
for (const file of ['src/3d-analysis/reporting/build3DSimplifiedCalculationReport.js','src/3d-analysis/Report3DSimplifiedPanel.jsx','src/3d-analysis/AnalysisStore.js','scripts/v18k-report-behavior-test.mjs']) {
  if (!fs.existsSync(file)) fail(`Missing required file: ${file}`);
}
const report = fs.readFileSync('src/3d-analysis/reporting/build3DSimplifiedCalculationReport.js','utf8');
for (const token of ['REPORT_3D_SIMPLIFIED_SCHEMA_VERSION','build3DSimplifiedCalculationReport','export3DSimplifiedReportJson','export3DSimplifiedReportMarkdown','FINAL_ISSUE_BLOCKED_SCREENING_METHOD']) {
  if (!report.includes(token)) fail(`Report builder missing token: ${token}`);
}
console.log('V18K report static check passed.');
