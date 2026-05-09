import fs from 'node:fs';
function fail(message){ console.error(`V18I check failed: ${message}`); process.exit(1); }
for (const file of ['src/core/solvers/supportLoads/solveSupportLoads3D.js','src/3d-analysis/SupportLoadResultsPanel.jsx','src/3d-analysis/AnalysisStore.js','scripts/v18i-support-loads-behavior-test.mjs']) {
  if (!fs.existsSync(file)) fail(`Missing required file: ${file}`);
}
const solver = fs.readFileSync('src/core/solvers/supportLoads/solveSupportLoads3D.js','utf8');
for (const token of ['SUPPORT_LOAD_SOLVER_SCHEMA_VERSION','solveSupportLoads3D','pipeWeight_N','fluidWeight_N','insulationWeight_N']) {
  if (!solver.includes(token)) fail(`Support solver missing token: ${token}`);
}
console.log('V18I support load static check passed.');
