#!/usr/bin/env node

import { convertSelectedNodeToBend, convertSelectedNodeToTee, convertSelectedNodeToOlet, autoConnectPipes, validateSketchCommand } from '../src/sketcher/commands/professionalDraftingCommands.js';

const failures = [];

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}: ${e.message}`);
    failures.push(name);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Test Convert Bend
test('Convert Bend with 2 connections', () => {
  const nodes = {
    A: { pos: [0, 0, 0], type: 'free' },
    B: { pos: [100, 0, 0], type: 'free' },
    C: { pos: [100, 100, 0], type: 'free' }
  };
  const segments = [
    { id: 'S1', startNode: 'A', endNode: 'B' },
    { id: 'S2', startNode: 'B', endNode: 'C' }
  ];
  const result = convertSelectedNodeToBend({ nodes, segments, selectedNodeId: 'B' });
  assert(result.ok === true, 'Result ok is true');
  assert(result.nodes.B.type === 'elbow', 'Node B type is elbow');
  assert(result.command === 'CONVERT_BEND', 'Command is CONVERT_BEND');
  assert(result.schemaVersion === 'sketch-drafting-command-v1', 'Schema version correct');
});

test('Convert Bend with wrong connection count fails', () => {
  const nodes = {
    A: { pos: [0, 0, 0], type: 'free' },
    B: { pos: [100, 0, 0], type: 'free' }
  };
  const segments = [
    { id: 'S1', startNode: 'A', endNode: 'B' }
  ];
  const result = convertSelectedNodeToBend({ nodes, segments, selectedNodeId: 'B' });
  assert(result.ok === false, 'Result ok is false');
  assert(result.diagnostics.some(d => d.code === 'INVALID_CONNECTION_COUNT'), 'Has INVALID_CONNECTION_COUNT diagnostic');
});

test('Convert Tee with 3 connections', () => {
  const nodes = {
    W: { pos: [0, 0, 0], type: 'free' },
    T: { pos: [100, 0, 0], type: 'free' },
    E: { pos: [200, 0, 0], type: 'free' },
    N: { pos: [100, 100, 0], type: 'free' }
  };
  const segments = [
    { id: 'S1', startNode: 'W', endNode: 'T' },
    { id: 'S2', startNode: 'T', endNode: 'E' },
    { id: 'S3', startNode: 'T', endNode: 'N' }
  ];
  const result = convertSelectedNodeToTee({ nodes, segments, selectedNodeId: 'T' });
  assert(result.ok === true, 'Result ok is true');
  assert(result.nodes.T.type === 'tee', 'Node T type is tee');
  assert(result.command === 'CONVERT_TEE', 'Command is CONVERT_TEE');
});

test('Convert Olet with 2 connections', () => {
  const nodes = {
    A: { pos: [0, 0, 0], type: 'free' },
    O: { pos: [100, 0, 0], type: 'free' },
    B: { pos: [100, 100, 0], type: 'free' }
  };
  const segments = [
    { id: 'S1', startNode: 'A', endNode: 'O' },
    { id: 'S2', startNode: 'O', endNode: 'B' }
  ];
  const result = convertSelectedNodeToOlet({ nodes, segments, selectedNodeId: 'O' });
  assert(result.ok === true, 'Result ok is true');
  assert(result.nodes.O.type === 'olet', 'Node O type is olet');
  assert(result.command === 'CONVERT_OLET', 'Command is CONVERT_OLET');
});

test('Auto Connect merges nearby nodes', () => {
  const nodes = {
    A: { pos: [0, 0, 0], type: 'free' },
    B: { pos: [100, 0, 0], type: 'free' },
    B2: { pos: [100.5, 0, 0], type: 'free' }
  };
  const segments = [
    { id: 'S1', startNode: 'A', endNode: 'B' },
    { id: 'S2', startNode: 'B2', endNode: 'A' }
  ];
  const result = autoConnectPipes({ nodes, segments, toleranceMm: 1.0 });
  assert(result.ok === true, 'Result ok is true');
  assert(result.meta.mergeCount === 1, 'Merge count is 1');
  assert(!result.nodes.B2, 'Node B2 is removed');
  assert(result.command === 'AUTO_CONNECT_PIPES', 'Command is AUTO_CONNECT_PIPES');
});

test('Validate Topology returns validation summary', () => {
  const nodes = {
    A: { pos: [0, 0, 0], type: 'free' },
    B: { pos: [100, 0, 0], type: 'free' }
  };
  const segments = [
    { id: 'S1', startNode: 'A', endNode: 'B' }
  ];
  const result = validateSketchCommand({ nodes, segments });
  assert(result.command === 'VALIDATE_TOPOLOGY', 'Command is VALIDATE_TOPOLOGY');
  assert(result.meta.validationSummary, 'Has validationSummary in meta');
  assert(result.meta.validationSummary.nodeCount === 2, 'Node count is 2');
  assert(result.meta.validationSummary.segmentCount === 1, 'Segment count is 1');
});

test('No selected node returns error', () => {
  const nodes = {
    A: { pos: [0, 0, 0], type: 'free' }
  };
  const segments = [];
  const result = convertSelectedNodeToBend({ nodes, segments, selectedNodeId: null });
  assert(result.ok === false, 'Result ok is false');
  assert(result.diagnostics.some(d => d.code === 'NO_SELECTED_NODE'), 'Has NO_SELECTED_NODE diagnostic');
});

if (failures.length > 0) {
  console.error(`\nV11 Behavior Tests FAILED: ${failures.length} test(s) failed`);
  process.exit(1);
}

console.log('\nV11 Behavior Tests PASSED');
process.exit(0);
