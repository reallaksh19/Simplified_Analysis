import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const directories = [
  join(root,'src/core/element-fea'),
  join(root,'src/core/workspace-consumers'),
  join(root,'src/workspace'),
  join(root,'scripts'),
  join(root,'e2e'),
];
const names = new Set([
  'constants.js','registry.js','view-state.js','index.js','application-shell-controller.js','workspace-layout.js',
  'element-fea-consumer-controller.js','element-fea-consumer-view.js','full-check.mjs',
]);
const files = directories.flatMap(walk).filter(inScope);
for (const file of files) validateFile(file);
console.log(`LFEA-001 source guard passed for ${files.length} JavaScript files.`);

function inScope(file) {
  const name=file.split('/').at(-1);
  return /\.(m?js)$/.test(file) && (file.includes('/element-fea/') || name.startsWith('lfea-001-') || names.has(name));
}
function validateFile(file) {
  const text=readFileSync(file,'utf8'); const count=text.split(/\r?\n/).length-1;
  assert.ok(count < 300, `${relative(root,file)} exceeds 299 lines.`);
  assert.ok(!/export\s+default/.test(text), `${relative(root,file)} uses a default export.`);
  if (!file.endsWith('lfea-001-source-guard.mjs')) assert.ok(!new RegExp(['s','him'].join(''),'i').test(text), `${relative(root,file)} introduces a compatibility layer.`);
  if (!file.endsWith('lfea-001-source-guard.mjs')) assert.ok(!/__WORKSPACE_VIEWPORT_BACKEND__|writerBackend|canvasBackend/.test(text), `${relative(root,file)} introduces a runtime/writer/canvas switch.`);
}
function walk(directory){return readdirSync(directory).flatMap((name)=>{const path=join(directory,name);return statSync(path).isDirectory()?walk(path):[path];});}
