import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const BASE = 'ce719a719a740d5228b5a404a6848af878954609';
const ROOT = process.cwd();
const ALLOWED = [
  /^src\/core\/local-stress\//,
  /^scripts\/local-stress-contract-check\.mjs$/,
  /^scripts\/lafea\.1-[^/]+\.mjs$/,
  /^docs\/local-stress\//,
  /^package\.json$/,
  /^scripts\/(?:qa-check|release-candidate-check|u7-browser-qa-check)\.mjs$/,
  /^\.github\/workflows\/(?:u0-certification|release-candidate)\.yml$/,
];
const changed = git(['diff', '--name-only', `${BASE}...HEAD`]).trim().split('\n').filter(Boolean);
const forbidden = changed.filter((file) => !ALLOWED.some((pattern) => pattern.test(file)));
assert.deepEqual(forbidden, [], `LAFEA.1 scope violation:\n${forbidden.join('\n')}`);
assert.equal(changed.includes('package-lock.json'), false, 'package-lock.json must not change.');
checkPackageDependencies();
checkProductionSources();
console.log('LAFEA.1 exact-base source scope and production boundaries passed.');

function checkPackageDependencies() {
  const baseline = JSON.parse(git(['show', `${BASE}:package.json`]));
  const current = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.deepEqual(current.dependencies, baseline.dependencies, 'Dependencies must not change.');
  assert.deepEqual(current.devDependencies, baseline.devDependencies, 'Dev dependencies must not change.');
  assert.ok(current.scripts['check:lafea.1'], 'check:lafea.1 must be registered.');
}
function checkProductionSources() {
  const directory = path.join(ROOT, 'src/core/local-stress');
  const files = fs.readdirSync(directory).filter((name) => name.endsWith('.js')).sort();
  assert.ok(files.length >= 8, 'Canonical foundation modules are missing.');
  files.forEach((name) => checkSourceFile(path.join(directory, name)));
  const pressure = fs.readFileSync(path.join(directory, 'pressure.js'), 'utf8');
  assert.ok(pressure.includes('assessmentPipeThickness'), 'Pressure must use assessment pipe thickness.');
  assert.ok(pressure.includes('ASSESSMENT_PIPE_THICKNESS_ONLY'), 'Pressure wall basis must be explicit.');
}
function checkSourceFile(file) {
  const source = fs.readFileSync(file, 'utf8');
  const relative = path.relative(ROOT, file).replaceAll('\\', '/');
  const lines = source.split('\n').length;
  assert.ok(lines < 300, `${relative} must remain below 300 lines.`);
  assert.equal(/export\s+default\b/.test(source), false, `${relative} must use named exports.`);
  for (const token of ['Math.random', 'Date.now(', 'performance.now(', 'new Date(', 'node:fs', 'node:path', 'fetch(', 'XMLHttpRequest', 'WebSocket']) {
    assert.equal(source.includes(token), false, `${relative} contains forbidden production token ${token}.`);
  }
  for (const token of ['WRC', 'Kellogg', 'EN 13480', 'ASME acceptance', 'shell element', 'fallback axis']) {
    assert.equal(source.toLowerCase().includes(token.toLowerCase()), false, `${relative} contains unauthorized method token ${token}.`);
  }
  const externalImports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]).filter((value) => !value.startsWith('.'));
  assert.deepEqual(externalImports, [], `${relative} must not import dependencies or runtime modules.`);
}
function git(args) { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }); }
