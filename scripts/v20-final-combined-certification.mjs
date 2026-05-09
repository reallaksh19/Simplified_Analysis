import fs from 'node:fs';
import { execSync } from 'node:child_process';

const commands = [
  'npm run check:package-json',

  'npm run check:v18a',
  'npm run check:v18a:behavior',
  'npm run check:v18b',
  'npm run check:v18b:behavior',
  'npm run check:v18c',
  'npm run check:v18c:behavior',
  'npm run check:v18d',
  'npm run check:v18d:behavior',
  'npm run check:v18e',
  'npm run check:v18e:behavior',
  'npm run check:v18f',
  'npm run check:v18f:behavior',
  'npm run check:v18g',
  'npm run check:v18g:behavior',
  'npm run check:v18h',
  'npm run check:v18h:behavior',
  'npm run check:v18i',
  'npm run check:v18i:behavior',
  'npm run check:v18j',
  'npm run check:v18j:behavior',
  'npm run check:v18j2',
  'npm run check:v18j2:behavior',
  'npm run check:v18k',
  'npm run check:v18k:behavior',
  'npm run check:v18l',
  'npm run check:v18l:behavior',

  'npm run check:v19',
  'npm run check:v19:behavior',
  'npm run check:v19b',
  'npm run check:v19b:behavior',
  'npm run check:v19c',
  'npm run check:v19c:behavior',
  'npm run check:v19d',
  'npm run check:v19d:behavior',
  'npm run check:v19e',
  'npm run check:v19e:behavior',
  'npm run check:v19f',
  'npm run check:v19f:behavior',
  'npm run check:v19g',
  'npm run check:v19g:behavior',
  'npm run check:v19h',
  'npm run check:v19h:behavior',
  'npm run check:v20',
  'npm run check:v20:behavior',

  'npm run check:benchmarks',
  'npm run build',
  'npm run check:e2e:v18l',
  'npm run check:e2e:v19g',
];

const startedAt = new Date().toISOString();
const results = [];
fs.mkdirSync('reports', { recursive: true });

for (const command of commands) {
  const item = { command, startedAt: new Date().toISOString(), status: 'PENDING' };
  try {
    const output = execSync(command, { stdio: 'pipe', encoding: 'utf8' });
    item.status = 'PASS';
    item.finishedAt = new Date().toISOString();
    item.outputTail = String(output || '').slice(-2000);
  } catch (error) {
    item.status = 'FAIL';
    item.finishedAt = new Date().toISOString();
    item.stdoutTail = String(error.stdout || '').slice(-4000);
    item.stderrTail = String(error.stderr || error.message || '').slice(-4000);
    results.push(item);

    fs.writeFileSync('reports/v20-final-certification-summary.json', JSON.stringify({
      schemaVersion: 'v20-final-certification-summary-v1',
      status: 'FAIL',
      startedAt,
      finishedAt: new Date().toISOString(),
      results,
    }, null, 2));

    console.error(`V20 final certification failed on: ${command}`);
    process.exit(1);
  }
  results.push(item);
}

fs.writeFileSync('reports/v20-final-certification-summary.json', JSON.stringify({
  schemaVersion: 'v20-final-certification-summary-v1',
  status: 'PASS',
  startedAt,
  finishedAt: new Date().toISOString(),
  results,
}, null, 2));

console.log('V20 final combined certification passed.');
