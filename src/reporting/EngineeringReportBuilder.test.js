import { EngineeringReportBuilder } from './EngineeringReportBuilder.js';
import { exportJsonReport } from './exportJsonReport.js';
import { exportHtmlReport } from './exportHtmlReport.js';
import assert from 'node:assert';

function runTests() {
  const builder = new EngineeringReportBuilder('PCF', '2D Simplified');

  builder.setProjectInfo({ name: 'Test Project' })
         .setResults({ maxStress: '15000 psi', passed: true })
         .addWarnings([{ code: 'W001', message: 'Test warning' }])
         .addAssumptions(['Pipe is rigid']);

  const report = builder.build();

  assert.strictEqual(report.inputSource, 'PCF');
  assert.strictEqual(report.calculationMethod, '2D Simplified');
  assert.strictEqual(report.projectInfo.name, 'Test Project');
  assert.strictEqual(report.results.passed, true);
  assert.strictEqual(report.warnings.length, 1);
  assert.strictEqual(report.assumptions.length, 1);

  const jsonOutput = exportJsonReport(report);
  assert(jsonOutput.includes('"Test Project"'));
  assert(jsonOutput.includes('"2D Simplified"'));

  const htmlOutput = exportHtmlReport(report);
  assert(htmlOutput.includes('Test Project'));
  assert(htmlOutput.includes('15000 psi'));
  assert(htmlOutput.includes('Test warning'));

  console.log('EngineeringReportBuilder tests passed!');
}

runTests();
