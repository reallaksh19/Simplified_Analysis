import fs from 'node:fs';
function fail(m){ console.error(`V19 check failed: ${m}`); process.exit(1); }
for (const f of ['src/data/legacy/wtValveweights.json','src/data/componentWeightMasterDb.js','src/core/engineering-data/resolveComponentData.js','src/sketcher/componentProperties/componentMasterResolver.js','scripts/v19-component-weight-master-behavior-test.mjs']) if(!fs.existsSync(f)) fail(`Missing ${f}`);
const source = fs.readFileSync('src/data/componentWeightMasterDb.js','utf8');
if (source.includes("assert { type: 'json' }") || source.includes('assert { type: "json" }')) fail('JSON import assertions are not allowed in V19 Node behavior tests; use inline or JS data export.');
for (const t of ['COMPONENT_WEIGHT_MASTER_SCHEMA_VERSION','normalizeLegacyWeightRow','resolveValveFromMaster','resolveFlangeFromMaster','const legacyRows']) if(!source.includes(t)) fail(`missing ${t}`);
JSON.parse(fs.readFileSync('src/data/legacy/wtValveweights.json','utf8'));
console.log('V19 component weight master static check passed.');
