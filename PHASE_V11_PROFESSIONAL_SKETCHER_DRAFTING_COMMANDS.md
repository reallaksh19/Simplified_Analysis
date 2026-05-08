# Phase V11: Professional Sketcher Drafting Commands

## Overview
Professional drafting command layer for the Sketcher, enabling topology transformation and validation operations.

## Command API

All commands return a result object with this schema:

```javascript
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

## Commands

### Convert Bend
- **Signature**: `convertSelectedNodeToBend({ nodes, segments, selectedNodeId })`
- **Precondition**: Selected node must have exactly 2 connected segments
- **Result**: Node type becomes `'elbow'`
- **Diagnostic**: `INVALID_CONNECTION_COUNT` if connection count ≠ 2

### Convert Tee
- **Signature**: `convertSelectedNodeToTee({ nodes, segments, selectedNodeId })`
- **Precondition**: Selected node must have exactly 3 connected segments
- **Result**: Node type becomes `'tee'`
- **Diagnostic**: `INVALID_CONNECTION_COUNT` if connection count ≠ 3

### Convert Olet
- **Signature**: `convertSelectedNodeToOlet({ nodes, segments, selectedNodeId })`
- **Precondition**: Selected node must have at least 2 connected segments
- **Result**: Node type becomes `'olet'`
- **Diagnostic**: `INSUFFICIENT_CONNECTION_COUNT` if connection count < 2

### Auto Connect Pipes
- **Signature**: `autoConnectPipes({ nodes, segments, toleranceMm = 1.0 })`
- **Behavior**: Merges node pairs within distance tolerance (default 1 mm)
- **Result**: Duplicate nodes removed, segments rewired, self-loops filtered
- **Meta**: `{ mergeCount, remap }` tracking merged node pairs

### Validate Topology
- **Signature**: `validateSketchCommand({ nodes, segments })`
- **Behavior**: Runs topology validation without modification
- **Result**: Diagnostics from `validateSketchTopology()`
- **Meta**: `{ validationSummary }` with nodeCount, segmentCount, errorCount, warningCount

## Store Integration

State fields:
- `topologyDiagnostics`: Diagnostics from last command
- `showTopologyDiagnostics`: Panel visibility flag
- `lastDraftingCommand`: Last executed command name
- `topologyValidationSummary`: Summary metadata

Store actions:
- `convertSelectedToBend()`, `convertSelectedToTee()`, `convertSelectedToOlet()`
- `autoConnectPipes(toleranceMm)`
- `validateTopology()`
- `applyDraftingCommandResult(result)`
- `setShowTopologyDiagnostics(show)`

## UI Components

### TopologyDiagnosticsPanel
Displays command results, diagnostics, and validation status.

Test IDs:
- `topology-diagnostics-panel`
- `topology-diagnostics-summary`
- `topology-diagnostics-close`
- `topology-diagnostics-empty`
- `topology-diagnostic-item`

### SketcherTab Toolbar Buttons
- `sketcher-convert-bend`
- `sketcher-convert-tee`
- `sketcher-convert-olet`
- `sketcher-auto-connect`
- `sketcher-validate-topology`

## Testing

Behavior tests: `scripts/v11-sketcher-drafting-commands-behavior-test.mjs`
- Convert Bend: 2 connections → elbow
- Convert Tee: 3 connections → tee
- Convert Olet: 2+ connections → olet
- Auto Connect: nodes within tolerance merged
- Validate: diagnostics collected

E2E tests: `e2e/v11-sketcher-drafting-commands.spec.js`
- Toolbar button visibility
- TopologyDiagnosticsPanel rendering
- Command execution feedback
