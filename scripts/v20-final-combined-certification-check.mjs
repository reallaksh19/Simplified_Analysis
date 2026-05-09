import fs from 'node:fs';

function fail(message) {
  console.error(`V20 check failed: ${message}`);
  process.exit(1);
}

for (const file of [
  'scripts/v20-final-combined-certification.mjs',
  'scripts/v20-final-combined-certification-behavior-test.mjs',
  'package.json',
]) {
  if (!fs.existsSync(file)) fail(`Missing required file: ${file}`);
}

const source = fs.readFileSync('scripts/v20-final-combined-certification.mjs', 'utf8');
for (const token of [
  'v20-final-certification-summary.json',
  'check:v19f',
  'check:v19g',
  'check:v19h',
  'check:v20',
  'npm run build',
]) {
  if (!source.includes(token)) fail(`V20 certification script missing token: ${token}`);
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const scriptName of ['check:v20', 'check:v20:behavior', 'certify:v20', 'ci:v20']) {
  if (!pkg.scripts?.[scriptName]) fail(`package.json missing script: ${scriptName}`);
}

console.log('V20 final combined certification static check passed.');
