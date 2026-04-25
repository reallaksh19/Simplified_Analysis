import fs from 'node:fs';
import path from 'node:path';

// This is a minimal test runner to verify moduleRegistry logic directly
// In a full environment this might be Jest/Vitest

const root = process.cwd();

async function runTests() {
  const { MODULE_REGISTRY } = await import('./moduleRegistry.js');
  let failed = false;

  const fail = (msg) => {
    console.error(`FAIL: ${msg}`);
    failed = true;
  };

  // 1. Array check
  if (!Array.isArray(MODULE_REGISTRY)) {
    fail('MODULE_REGISTRY is not an array.');
  }

  // 2. Contains required active module IDs
  const requiredIds = [
    'core-geometry',
    'pcf-interface',
    '2d-simplified-stress-check',
    '3d-guided-cantilever',
    'piperack-expansion-loop',
    'reporting',
    'benchmark-validation',
    'settings-defaults'
  ];

  for (const reqId of requiredIds) {
    if (!MODULE_REGISTRY.some(m => m.id === reqId && m.status === 'ACTIVE')) {
      fail(`Missing required ACTIVE module with ID: ${reqId}`);
    }
  }

  // 3. Contains required reference module
  if (!MODULE_REGISTRY.some(m => m.id === 'spl2-bundle' && m.status === 'REFERENCE')) {
    fail('Missing required REFERENCE module spl2-bundle');
  }

  // 4. Contains removed modules
  const removedIds = [
    'gc3d-legacy',
    'adv-piperack-legacy',
    'simp-analysis-legacy',
    'extended-solver-legacy'
  ];
  for (const reqId of removedIds) {
    if (!MODULE_REGISTRY.some(m => m.id === reqId && m.status === 'REMOVED')) {
      fail(`Missing required REMOVED module representation: ${reqId}`);
    }
  }

  // 5. Check engineeringLevel property values
  const validEngineeringLevels = ['SCREENING', 'DESIGN_AID', 'REFERENCE', 'DATA_INTERFACE', 'UNKNOWN'];
  for (const mod of MODULE_REGISTRY) {
    if (!validEngineeringLevels.includes(mod.engineeringLevel)) {
      fail(`Invalid engineeringLevel ${mod.engineeringLevel} on module ${mod.id}`);
    }
    if (mod.status === 'ACTIVE' && mod.engineeringLevel === 'UNKNOWN') {
      fail(`Active module cannot have engineeringLevel UNKNOWN: ${mod.id}`);
    }
  }

  // 6. Check forbidden logic behavior is represented
  const gc3d = MODULE_REGISTRY.find(m => m.id === 'gc3d-legacy');
  if (!gc3d || !gc3d.forbiddenPaths.includes('src/gc3d')) {
     fail('gc3d-legacy must explicitly forbid src/gc3d path.');
  }

  if (failed) {
    console.error('src/config/moduleRegistry.test.js failed.');
    process.exit(1);
  } else {
    console.log('src/config/moduleRegistry.test.js passed.');
    process.exit(0);
  }
}

runTests();
