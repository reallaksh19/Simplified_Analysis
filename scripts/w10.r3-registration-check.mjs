import assert from 'node:assert/strict';
import fs from 'node:fs';

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const key of ['check:w10.r3:contracts','check:w10.r3:properties','check:w10.r3:source','check:w10.r3:browser','check:w10.r3']) {
  assert.equal(typeof packageJson.scripts[key], 'string', `Missing package script ${key}.`);
}
assert.match(packageJson.scripts['check:u7'], /check:w10\.r3:source/);
assert.match(packageJson.scripts['check:release'], /check:w10\.r3:source/);
assert.match(packageJson.scripts['check:workspace-browser'], /w10\.r3-settings-authority\.spec\.js/);
const workflow = fs.readFileSync('.github/workflows/w10-r3-certification.yml', 'utf8');
for (const token of ['W10.R3 Settings Authority Certification','npm run check:w10.r3','npm run check:full','npm run check:workspace-browser','npm run build']) assert.match(workflow, new RegExp(escape(token)));
const r2Guard = fs.readFileSync('scripts/w10.r2-pcf-intake-source-guard.mjs', 'utf8');
assert.match(r2Guard, /W10_R2_MERGED_SHA/);
console.log('✅ W10.R3 package, workflow and successor registration passed.');
function escape(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
