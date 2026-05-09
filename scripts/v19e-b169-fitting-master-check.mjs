import fs from 'node:fs';
function fail(m){ console.error(`V19E check failed: ${m}`); process.exit(1); }
for (const f of ['src/data/b169FittingDimensionalMasterDb.js','src/core/engineering-data/resolveB169FittingData.js','src/sketcher/componentProperties/b169FittingMasterResolver.js','scripts/v19e-b169-fitting-master-behavior-test.mjs']) if(!fs.existsSync(f)) fail(`Missing ${f}`);
const db=fs.readFileSync('src/data/b169FittingDimensionalMasterDb.js','utf8');
for (const t of ['B169_FITTING_DIMENSIONAL_SCHEMA_VERSION','resolveReducerDimensions','resolveTeeDimensions','B169_REDUCER_DIMENSION_SCREENING_SAMPLE','B169_TEE_DIMENSION_SCREENING_SAMPLE']) if(!db.includes(t)) fail(`B169 missing ${t}`);
const panel=fs.existsSync('src/sketcher/ElementListingPanel.jsx') ? fs.readFileSync('src/sketcher/ElementListingPanel.jsx','utf8') : '';
if(panel.includes('length_mm: 178') || panel.includes('weight_kg: 12')) fail('Reducer quick insert must not use hard-coded length/weight');
for (const token of ['element-panel-insert-reducer','element-panel-insert-fvf','resolveReducerInsertData','resolveFlangeValveFlangeInsertData']) if(!panel.includes(token)) fail(`ElementListingPanel missing master-driven insert token: ${token}`);
console.log('V19E B16.9 fitting master static check passed.');
