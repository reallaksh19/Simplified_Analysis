import fs from 'node:fs';
function fail(m){ console.error(`V19B check failed: ${m}`); process.exit(1); }
for (const f of ['src/data/flangeDimensionalMasterDb.js','scripts/v19b-flange-dimensional-master-behavior-test.mjs']) if(!fs.existsSync(f)) fail(`Missing ${f}`);
const source=fs.readFileSync('src/data/flangeDimensionalMasterDb.js','utf8');
for (const t of ['FLANGE_DIMENSIONAL_MASTER_SCHEMA_VERSION','resolveFlangeDimensions','thickness_mm','gasketAllowance_mm']) if(!source.includes(t)) fail(`missing ${t}`);
console.log('V19B flange dimensional master static check passed.');
