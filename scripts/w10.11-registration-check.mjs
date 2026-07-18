import assert from 'node:assert/strict';
import fs from 'node:fs';

const packageJson=JSON.parse(fs.readFileSync('package.json','utf8'));
const requiredScripts=['check:w10.11:static','check:w10.11:browser','check:w10.11'];
requiredScripts.forEach((key)=>assert.equal(typeof packageJson.scripts[key],'string',`${key} is not registered.`));
assert.match(packageJson.scripts['check:workspace-browser'],/w10\.11-pipe-solver-consumer\.spec\.js/);
assert.match(packageJson.scripts['check:u7'],/w10\.11-registration-check\.mjs/);
assert.match(packageJson.scripts['check:release'],/w10\.11-registration-check\.mjs/);
for(const file of ['.github/workflows/u0-certification.yml','.github/workflows/release-candidate.yml']){
  const content=fs.readFileSync(file,'utf8');
  assert.match(content,/W10\.11/);
  assert.match(content,/check:w10\.11:browser/);
}
assert.match(fs.readFileSync('scripts/qa-check.mjs','utf8'),/W10\.11 Pipe Solver Consumer Static Check/);
console.log('✅ W10.11 certification registration is complete.');
