import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const BASE='23828ceb8a66466e9dc327d191489b0fd5b874e1',ROOT=process.cwd();
const ALLOWED=[/^src\/core\/local-attachment-screening\//,/^scripts\/lafea\.2-[^/]+\.mjs$/,/^docs\/local-attachment-screening\//,/^package\.json$/,/^scripts\/qa-check\.mjs$/];
ensureBase();
const changed=lines(['diff','--name-only',BASE,'HEAD']);
const forbidden=changed.filter((file)=>!ALLOWED.some((rule)=>rule.test(file)));
assert.deepEqual(forbidden,[],`LAFEA.2 scope violation:\n${forbidden.join('\n')}`);
assert.equal(changed.includes('package-lock.json'),false,'package-lock.json must not change.');
assert.equal(changed.some((file)=>file.startsWith('.github/workflows/')),false,'GitHub Actions changes are forbidden.');
checkDependencies();checkRegistration();checkProduction();
console.log(`LAFEA.2 exact-base scope and production boundaries passed for ${changed.length} changed file(s).`);
function checkDependencies(){const before=JSON.parse(git(['show',`${BASE}:package.json`])),after=JSON.parse(read('package.json'));assert.deepEqual(after.dependencies,before.dependencies,'Dependencies must not change.');assert.deepEqual(after.devDependencies,before.devDependencies,'Dev dependencies must not change.');}
function checkRegistration(){const pkg=JSON.parse(read('package.json')),qa=read('scripts/qa-check.mjs');assert.ok(pkg.scripts['check:lafea.2'],'check:lafea.2 must be registered.');assert.ok(qa.includes("npm run check:lafea.2"),'QA must register LAFEA.2.');}
function checkProduction(){const directory=path.join(ROOT,'src/core/local-attachment-screening');for(const name of fs.readdirSync(directory).filter((value)=>value.endsWith('.js')).sort()){const file=path.join(directory,name),source=read(file),relative=path.relative(ROOT,file).replaceAll('\\','/');assert.ok(source.split(/\r?\n/).length<300,`${relative} must remain below 300 lines.`);assert.equal(/export\s+default\b/.test(source),false,`${relative} must use named exports.`);for(const token of forbiddenTokens())assert.equal(source.includes(token),false,`${relative} contains forbidden production token ${token}.`);assert.deepEqual(externalImports(source),[],`${relative} must not import dependencies or runtime modules.`);functionSpans(source).filter((row)=>row.lines>40).forEach((row)=>assert.fail(`${relative} function ${row.name} has ${row.lines} lines.`));}}
function forbiddenTokens(){return ['Math.random','Date.now(','performance.now(','new Date(','node:fs','node:path','fetch(','XMLHttpRequest','WebSocket','document.','window.','WRC','Kellogg','stress concentration factor','transverse shear stress approximation','shell element','allowable','utilization'];}
function externalImports(source){return [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((row)=>row[1]).filter((value)=>!value.startsWith('.'));}
function functionSpans(source){const values=source.split(/\r?\n/),rows=[];for(let index=0;index<values.length;index+=1){const match=values[index].match(/^\s*(?:export\s+)?function\s+(\w+)\s*\(/);if(!match)continue;let depth=0,end=index;for(;end<values.length;end+=1){depth+=(values[end].match(/{/g)||[]).length;depth-=(values[end].match(/}/g)||[]).length;if(depth===0&&end>index)break;}rows.push({name:match[1],lines:end-index+1});}return rows;}
function ensureBase(){try{execFileSync('git',['cat-file','-e',`${BASE}^{commit}`],{cwd:ROOT,stdio:'ignore'});}catch{throw new Error(`Accepted baseline ${BASE} is not available locally.`);}}
function read(file){return fs.readFileSync(path.join(ROOT,file),'utf8');}
function lines(args){return git(args).split(/\r?\n/).filter(Boolean);}
function git(args){return execFileSync('git',args,{cwd:ROOT,encoding:'utf8'});}
