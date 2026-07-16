import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const base = 'c13c7cdaa313fe5ef7cb78a527be69b602210f20';
ensureBaseCommit();
const changed = git('diff', '--name-only', base, 'HEAD').trim().split(/\r?\n/).filter(Boolean);
const allowedExisting = new Set([
  'src/workspace/bootstrap.js', 'src/workspace/workspace-layout.js', 'src/workspace/event-topics.js', 'src/workspace/workspace.css',
  'package.json', '.github/workflows/u0-certification.yml', '.github/workflows/release-candidate.yml',
  'scripts/qa-check.mjs', 'scripts/u7-browser-qa-check.mjs', 'scripts/release-candidate-check.mjs',
]);
const allowedNew = [/^src\/core\/workspace-consumers\//, /^src\/workspace\/application-shell-.*\.js$/, /^src\/workspace\/workspace-consumer-.*\.js$/, /^src\/workspace\/reports-consumer-.*\.js$/, /^scripts\/w10\.8-.*\.mjs$/, /^e2e\/w10\.8-.*\.spec\.js$/, /^docs\/workspace-consumers\//];
const forbidden = ['package-lock.json', 'src/main.js', 'src/App.jsx'];
for (const file of changed) {
  assert.equal(forbidden.includes(file), false, `Forbidden file changed: ${file}`);
  assert.ok(allowedExisting.has(file) || allowedNew.some((pattern) => pattern.test(file)), `Out-of-scope file changed: ${file}`);
}
const sourceFiles = changed.filter((file) => /^(src\/core\/workspace-consumers|src\/workspace\/(application-shell|workspace-consumer|reports-consumer)-).+\.js$/.test(file));
for (const file of sourceFiles) checkSourceFile(file);
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const basePackage = JSON.parse(git('show', `${base}:package.json`));
assert.deepEqual(packageJson.dependencies, basePackage.dependencies, 'Dependencies changed.');
assert.deepEqual(packageJson.devDependencies, basePackage.devDependencies, 'Dev dependencies changed.');
console.log(`✅ W10.8 source guard passed for ${changed.length} changed files and ${sourceFiles.length} new runtime files.`);

function checkSourceFile(file) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  assert.ok(text.split(/\r?\n/).length < 300, `${file} exceeds 299 lines`);
  assert.doesNotMatch(text, /from ['"][^'"]*(react|zustand|three|src\/reporting|\.\.\/reporting|solver-execution)/i, `${file} imports a forbidden runtime`);
  assert.doesNotMatch(text, /\b(Date\.now|new Date|Math\.random|randomUUID|uuid)\b/, `${file} uses nondeterministic identity`);
  assert.doesNotMatch(text, /export\s+default/, `${file} uses a default export`);
}
function ensureBaseCommit() {
  try { execFileSync('git', ['cat-file', '-e', `${base}^{commit}`], { cwd: root, stdio: 'ignore' }); }
  catch { execFileSync('git', ['fetch', '--no-tags', '--depth=1', 'origin', base], { cwd: root, stdio: 'ignore' }); }
}
function git(...args) { return execFileSync('git', args, { cwd: root, encoding: 'utf8' }); }