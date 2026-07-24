import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'd9a9431cc25750d9fccf2c21936cd5d6099ff3ff';
const MERGED_SHA = 'ae3158c36e9da055be921151f98dce06d03bd240';
const root = process.cwd();
const sourceRoot = path.join(root, 'src/core/local-continuum');
const selected = process.argv[2] || 'all';
const successorMode = isAncestor(MERGED_SHA, 'HEAD');

if (selected === 'all') {
  checkSource();
  checkDependencies();
  checkRegistration();
  if (!successorMode) checkPaths();
} else if (selected === 'paths') checkPaths();
else if (selected === 'source') checkSource();
else if (selected === 'dependencies') checkDependencies();
else if (selected === 'registration') checkRegistration();
else throw new TypeError(`Unknown LAFEA.3 source-guard check: ${selected}.`);

console.log(`LAFEA.3 source guard ${selected} passed in ${successorMode ? 'successor' : 'implementation'} mode.`);

function checkPaths() {
  ensureCommit(BASE);
  const changed = gitLines(['diff', '--name-only', BASE, 'HEAD']);
  const forbidden = changed.filter((file) => !allowedPath(file));
  assert.deepEqual(forbidden, [], `LAFEA.3 scope violation:\n${forbidden.join('\n')}`);
  assert.equal(changed.includes('package-lock.json'), false, 'package-lock.json must not change.');
  assert.equal(changed.some((file) => file.startsWith('.github/workflows/')), false, 'Workflow changes are forbidden.');
}

function checkSource() {
  const failures = [];
  for (const file of walk(sourceRoot)) validateSource(file, failures);
  assert.deepEqual(failures, [], failures.join('\n'));
}

function validateSource(file, failures) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  if (lines.length > 300) failures.push(`${relative}: ${lines.length} lines`);
  if (/export\s+default/.test(text)) failures.push(`${relative}: default export`);
  if (/element-fea|workspace|components|store|local-stress|local-attachment-screening/.test(text)) failures.push(`${relative}: forbidden import/domain`);
  if (/\b(Date\.now|Math\.random|performance\.now|fetch\s*\(|XMLHttpRequest|document\.|window\.|process\.|node:fs|node:child_process)\b/.test(text)) failures.push(`${relative}: forbidden runtime dependency`);
  checkFunctionSpans(lines, relative, failures);
}

function checkDependencies() {
  ensureCommit(BASE);
  const before = JSON.parse(git(['show', `${BASE}:package.json`]));
  const after = JSON.parse(read('package.json'));
  assert.deepEqual(after.dependencies, before.dependencies, 'Dependencies must not change.');
  assert.deepEqual(after.devDependencies, before.devDependencies, 'Dev dependencies must not change.');
}

function checkRegistration() {
  const pkg = JSON.parse(read('package.json'));
  const qa = read('scripts/qa-check.mjs');
  assert.ok(pkg.scripts['check:lafea.3'], 'check:lafea.3 must remain registered.');
  assert.ok(qa.includes('npm run check:lafea.3'), 'QA must retain LAFEA.3 registration.');
}

function allowedPath(file) {
  return file.startsWith('src/core/local-continuum/') || file.startsWith('scripts/lafea.3-')
    || file.startsWith('docs/local-continuum/') || file === 'package.json' || file === 'scripts/qa-check.mjs';
}

function checkFunctionSpans(lines, relative, failures) {
  for (let index = 0; index < lines.length; index += 1) {
    if (!/\bfunction\b|=>\s*\{/.test(lines[index])) continue;
    const end = functionEnd(lines, index);
    if (end - index + 1 > 40) failures.push(`${relative}:${index + 1} function spans ${end - index + 1} lines`);
  }
}

function functionEnd(lines, start) {
  let depth = 0, opened = false;
  for (let index = start; index < lines.length; index += 1) {
    for (const char of lines[index]) {
      if (char === '{') { depth += 1; opened = true; }
      if (char === '}') depth -= 1;
    }
    if (opened && depth <= 0) return index;
  }
  return lines.length - 1;
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith('.js')) files.push(full);
  }
  return files;
}

function isAncestor(ancestor, descendant) {
  try { execFileSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], { cwd: root, stdio: 'ignore' }); return true; }
  catch { return false; }
}
function ensureCommit(sha) {
  try { execFileSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root, stdio: 'ignore' }); }
  catch { execFileSync('git', ['fetch', '--no-tags', '--depth=1', 'origin', sha], { cwd: root, stdio: 'ignore' }); }
}
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function gitLines(args) { return git(args).split(/\r?\n/).filter(Boolean); }
function git(args) { return execFileSync('git', args, { cwd: root, encoding: 'utf8' }); }
