import assert from 'node:assert/strict';
import fs from 'node:fs';

const requiredFiles = [
  'docs/workspace-consumers/W10.8_WORKSPACE_CONSUMERS.md',
  'scripts/w10.8-workspace-consumer-contract-check.mjs',
  'scripts/w10.8-workspace-consumer-property-check.mjs',
  'scripts/w10.8-workspace-consumer-source-guard.mjs',
  'e2e/w10.8-workspace-consumers.spec.js',
  'src/core/workspace-consumers/index.js',
  'src/workspace/application-shell-controller.js',
  'src/workspace/reports-consumer-panel.js',
];
requiredFiles.forEach((file) => assert.equal(fs.existsSync(file), true, `Missing W10.8 release evidence: ${file}`));
const bootstrap = fs.readFileSync('src/workspace/bootstrap.js', 'utf8');
[
  'getWorkspaceConsumerContext', 'listWorkspaceConsumers', 'getWorkspaceConsumerReadiness',
  'getApplicationViewState', 'activateApplicationView',
].forEach((name) => assert.match(bootstrap, new RegExp(name), `Missing W10.8 public API: ${name}`));
const packageJson = fs.readFileSync('package.json', 'utf8');
['check:w10.8:static', 'check:w10.8:browser', 'check:w10.8', 'e2e/w10.8-workspace-consumers.spec.js']
  .forEach((value) => assert.match(packageJson, new RegExp(value.replaceAll('.', '\\.')), `Missing W10.8 certification registration: ${value}`));
console.log('✅ W10.8 U7 and release registration guard passed.');