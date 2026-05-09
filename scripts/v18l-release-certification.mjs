import fs from 'node:fs';
import { execSync } from 'node:child_process';

const commands = [
  'npm run check:v18l',
  'npm run check:v18l:behavior',
  'npm run check:package-json',
  'npm run check:benchmarks',
  'npm run build',
  'npm run check:e2e:v18l',
];

const startedAt = new Date().toISOString();
const results = [];

fs.mkdirSync('reports', { recursive: true });

for (const command of commands) {
  const started = new Date().toISOString();
  try {
    execSync(command, { stdio: 'pipe', encoding: 'utf8' });
    results.push({
      command,
      status: 'PASS',
      startedAt: started,
      finishedAt: new Date().toISOString(),
    });
  } catch (error) {
    results.push({
      command,
      status: 'FAIL',
      startedAt: started,
      finishedAt: new Date().toISOString(),
      stdout: String(error.stdout || '').slice(-4000),
      stderr: String(error.stderr || error.message || '').slice(-4000),
    });

    fs.writeFileSync(
      'reports/v18l-certification-summary.json',
      JSON.stringify({
        schemaVersion: 'v18l-certification-summary-v1',
        status: 'FAIL',
        startedAt,
        finishedAt: new Date().toISOString(),
        results,
      }, null, 2),
    );

    console.error(`V18L certification failed on: ${command}`);
    process.exit(1);
  }
}

fs.writeFileSync(
  'reports/v18l-certification-summary.json',
  JSON.stringify({
    schemaVersion: 'v18l-certification-summary-v1',
    status: 'PASS',
    startedAt,
    finishedAt: new Date().toISOString(),
    results,
  }, null, 2),
);

console.log('V18L release certification passed.');
