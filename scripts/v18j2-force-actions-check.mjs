import fs from 'node:fs';
function fail(message){ console.error(`V18J2 check failed: ${message}`); process.exit(1); }
for (const file of ['src/core/solvers/forceActions/solve3DForceActions.js','src/3d-analysis/ForceActionResultsPanel.jsx','src/3d-analysis/AnalysisStore.js','scripts/v18j2-force-actions-behavior-test.mjs']) {
  if (!fs.existsSync(file)) fail(`Missing required file: ${file}`);
}
const solver = fs.readFileSync('src/core/solvers/forceActions/solve3DForceActions.js','utf8');
for (const token of ['FORCE_ACTION_SOLVER_SCHEMA_VERSION','solve3DForceActions','PRESSURE_THRUST_F_PA','RESTRAINED_THERMAL_AXIAL_FORCE_E_A_ALPHA_DT','SUPPORT_FRICTION_LIMIT_MU_N']) {
  if (!solver.includes(token)) fail(`Force solver missing token: ${token}`);
}
console.log('V18J2 force actions static check passed.');
