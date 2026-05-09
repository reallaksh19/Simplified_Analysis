import fs from 'node:fs';

function fail(message) {
  console.error(`V20 behavior check failed: ${message}`);
  process.exit(1);
}

const source = fs.readFileSync('scripts/v20-final-combined-certification.mjs', 'utf8');

for (const command of [
  'npm run check:v18a',
  'npm run check:v18f',
  'npm run check:v18k',
  'npm run check:v19e',
  'npm run check:v19f',
  'npm run check:v19g',
  'npm run check:v19h',
  'npm run check:v20',
  'npm run build',
]) {
  if (!source.includes(command)) fail(`V20 certification command missing: ${command}`);
}

if (!source.includes('execSync') || !source.includes('reports/v20-final-certification-summary.json')) {
  fail('V20 certification script must execute commands and write final summary.');
}

console.log('V20 final combined certification behavior check passed.');
