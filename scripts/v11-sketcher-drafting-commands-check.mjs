#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const errors = [];

function check(condition, message) {
  if (!condition) errors.push(message);
}

// Check professionalDraftingCommands.js exports
const cmdPath = new URL('../src/sketcher/commands/professionalDraftingCommands.js', import.meta.url);
check(fs.existsSync(cmdPath.pathname), 'professionalDraftingCommands.js exists');

if (fs.existsSync(cmdPath.pathname)) {
  const content = fs.readFileSync(cmdPath.pathname, 'utf-8');
  check(content.includes('export const SKETCH_DRAFTING_COMMAND_SCHEMA_VERSION'), 'Exports SKETCH_DRAFTING_COMMAND_SCHEMA_VERSION');
  check(content.includes('export function convertSelectedNodeToBend'), 'Exports convertSelectedNodeToBend');
  check(content.includes('export function convertSelectedNodeToTee'), 'Exports convertSelectedNodeToTee');
  check(content.includes('export function convertSelectedNodeToOlet'), 'Exports convertSelectedNodeToOlet');
  check(content.includes('export function autoConnectPipes'), 'Exports autoConnectPipes');
  check(content.includes('export function validateSketchCommand'), 'Exports validateSketchCommand');
}

// Check TopologyDiagnosticsPanel.jsx
const panelPath = new URL('../src/sketcher/TopologyDiagnosticsPanel.jsx', import.meta.url);
check(fs.existsSync(panelPath.pathname), 'TopologyDiagnosticsPanel.jsx exists');

if (fs.existsSync(panelPath.pathname)) {
  const content = fs.readFileSync(panelPath.pathname, 'utf-8');
  check(content.includes('topology-diagnostics-panel'), 'Has topology-diagnostics-panel testid');
  check(content.includes('topology-diagnostics-close'), 'Has topology-diagnostics-close testid');
  check(content.includes('topology-diagnostics-summary'), 'Has topology-diagnostics-summary testid');
  check(content.includes('topology-diagnostics-empty'), 'Has topology-diagnostics-empty testid');
  check(content.includes('topology-diagnostic-item'), 'Has topology-diagnostic-item testid');
}

// Check SketcherStore.js has conversion actions
const storePath = new URL('../src/sketcher/SketcherStore.js', import.meta.url);
check(fs.existsSync(storePath.pathname), 'SketcherStore.js exists');

if (fs.existsSync(storePath.pathname)) {
  const content = fs.readFileSync(storePath.pathname, 'utf-8');
  check(content.includes('convertSelectedToBend') || content.includes('applyDraftingCommandResult'), 'SketcherStore has conversion actions or drafting result handler');
}

// Check SketcherTab.jsx has toolbar buttons
const tabPath = new URL('../src/sketcher/SketcherTab.jsx', import.meta.url);
check(fs.existsSync(tabPath.pathname), 'SketcherTab.jsx exists');

if (fs.existsSync(tabPath.pathname)) {
  const content = fs.readFileSync(tabPath.pathname, 'utf-8');
  check(content.includes('sketcher-convert-bend'), 'SketcherTab has sketcher-convert-bend testid');
}

if (errors.length > 0) {
  console.error('V11 Static Checks FAILED:');
  errors.forEach(e => console.error(`  - ${e}`));
  process.exit(1);
}

console.log('V11 Static Checks PASSED');
process.exit(0);
