import fs from 'node:fs';
function fail(m){ console.error(`V19D check failed: ${m}`); process.exit(1); }
for (const f of ['src/core/engineering-data/validateMasterDbGovernance.js','src/3d-analysis/reporting/build3DSimplifiedCalculationReport.js','scripts/v19d-master-db-governance-behavior-test.mjs']) if(!fs.existsSync(f)) fail(`Missing ${f}`);
const gov=fs.readFileSync('src/core/engineering-data/validateMasterDbGovernance.js','utf8');
for (const t of ['MASTER_DB_GOVERNANCE_SCHEMA_VERSION','buildMasterDbGovernanceSummary','MODEL_SEGMENT_RATING_MISSING','MODEL_B169_FITTING_NOT_FINAL_QUALITY']) if(!gov.includes(t)) fail(`governance missing ${t}`);
const report=fs.readFileSync('src/3d-analysis/reporting/build3DSimplifiedCalculationReport.js','utf8');
if(!report.includes('Master DB Governance') || !report.includes('masterDbGovernance')) fail('report must include master DB governance');
console.log('V19D master DB governance static check passed.');
