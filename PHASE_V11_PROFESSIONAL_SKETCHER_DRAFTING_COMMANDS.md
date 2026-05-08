# Phase V11: Professional Sketcher Drafting Commands

## Overview

Phase V11 adds a professional-grade command layer to the Sketcher for topology manipulation:
- **Convert Bend**: Converts a node with exactly 2 connections to type `elbow`
- **Convert Tee**: Converts a node with exactly 3 connections to type `tee`
- **Convert Olet**: Converts a node with ≥2 connections to type `olet`
- **Auto Connect Pipes**: Merges nodes within a tolerance distance (default 1.0 mm)
- **Validate Topology**: Validates sketch topology and stores diagnostics

## Files

### New
- `src/sketcher/commands/professionalDraftingCommands.js` — Pure command functions
- `src/sketcher/TopologyDiagnosticsPanel.jsx` — UI panel for displaying validation results
- `scripts/v11-sketcher-drafting-commands-check.mjs` — Static verification checks
- `scripts/v11-sketcher-drafting-commands-behavior-test.mjs` — Behavior tests
- `e2e/v11-sketcher-drafting-commands.spec.js` — Browser E2E tests

### Updated
- `src/sketcher/SketcherStore.js` — Added state and actions for drafting commands
- `src/sketcher/SketcherTab.jsx` — Added toolbar buttons and diagnostics panel
- `package.json` — Added check and CI scripts

## Command Schema

All commands return a consistent shape:
```js
{
  schemaVersion: 'sketch-drafting-command-v1',
  ok: boolean,
  command: string,
  nodes: {},
  segments: [],
  diagnostics: [],
  message: string,
  meta: {}
}
```

## Key Diagnostic Codes

- `NO_SELECTED_NODE` — No node selected or node does not exist
- `INVALID_CONNECTION_COUNT` — Node has wrong number of connections
- `INSUFFICIENT_CONNECTION_COUNT` — Node has too few connections
- `AUTO_CONNECT_PIPES` — Info diagnostic on merge count
- `VALIDATE_TOPOLOGY` — Info diagnostic from validation

## Validation Integration

Commands use `validateSketchTopology()` from `src/sketcher/topology/validateSketchTopology.js` to ensure topology remains valid after transformation.

Auto Connect also removes self-loop segments and cleans up duplicate nodes.

## Store Integration

The SketcherStore now tracks:
- `topologyDiagnostics` — Array of diagnostic objects
- `showTopologyDiagnostics` — Boolean for UI visibility
- `lastDraftingCommand` — Last executed command name

Actions include:
- `convertSelectedToBend()` — User action wrapper
- `convertSelectedToTee()` — User action wrapper
- `convertSelectedToOlet()` — User action wrapper
- `autoConnectPipes(toleranceMm)` — User action wrapper
- `validateTopology()` — User action wrapper
- `applyDraftingCommandResult(result)` — Internal: applies command result to state
