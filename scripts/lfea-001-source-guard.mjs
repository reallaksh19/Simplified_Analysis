import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const core = join(root, 'src/core/element-fea');
const scripts = join(root, 'scripts');
const files = [...walk(core), ...walk(scripts).filter((file) => basename(file).startsWith('lfea-001-'))];
for (const file of files) validateFile(file);
validateProductionImports();
validateScopeBoundary();
console.log(`LFEA-001 source, module-size, import and scope guards passed for ${files.length} files.`);

function validateFile(file) {
  const text = readFileSync(file, 'utf8');
  const lineCount = text.split(/\r?\n/).length - 1;
  assert.ok(lineCount < 300, `${relative(root, file)} exceeds 299 lines.`);
  assert.ok(!/export\s+default/.test(text), `${relative(root, file)} uses a default export.`);
  assert.ok(!/\beval\s*\(|new\s+Function\s*\(/.test(text), `${relative(root, file)} uses dynamic code execution.`);
}
function validateProductionImports() {
  for (const file of walk(core)) {
    const text = readFileSync(file, 'utf8');
    const imports = [...text.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
    imports.forEach((specifier) => {
      const allowedShared = specifier === '../shared-piping-model/immutable.js' || specifier === '../shared-piping-model/canonical-json.js';
      assert.ok(specifier.startsWith('./') || allowedShared, `${relative(root, file)} imports unauthorized authority: ${specifier}`);
    });
  }
}
function validateScopeBoundary() {
  const production = walk(core).map((file) => readFileSync(file, 'utf8')).join('\n');
  for (const forbidden of ['workspace-consumer-registry', 'application-view-state', 'W11', 'PIPE_SOLVER', 'canvas', 'viewport', 'piping-code']) {
    assert.equal(production.includes(forbidden), false, `Production core crosses excluded boundary: ${forbidden}`);
  }
  const geometry = readFileSync(join(core, 't3-geometry.js'), 'utf8');
  assert.equal(geometry.includes('Math.abs'), false, 'T3 signed area must not be repaired with an absolute value.');
  const model = readFileSync(join(core, 'model.js'), 'utf8');
  assert.equal(/\.reverse\s*\(\)/.test(model), false, 'Element connectivity must not be silently reversed.');
}
function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
