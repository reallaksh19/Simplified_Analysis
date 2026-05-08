# PHASE U4: SKETCHER TOPOLOGY AND FITTING UPGRADE

## Objective
Replace order-dependent tee classification in `GraphTranslator.js` with vector-colinearity-based classification that is invariant to segment ordering.

## Problem Statement
Previously, `buildComponentsFromGraph()` classified tee main run vs branch by assuming:
- Segments 0 and 1 are the main run
- Segment 2 is the branch

This is unsafe because segment order in `connected` array is arbitrary and depends on graph traversal order.

## Solution
Introduce geometric classification:

### New Modules
- `src/sketcher/topology/validateSketchTopology.js`
  - `buildConnectionIndex(segments)` — build adjacency index
  - `validateSketchTopology(nodes, segments, options)` — validate topology against schema
  - Detects missing nodes, zero-length segments, invalid fitting connection counts, and unsupported geometry

- `src/sketcher/topology/classifyTeeMainBranch.js`
  - `classifyTeeMainBranch(nodes, nodeId, connectedSegments)` — classify tee segments by colinearity
  - Returns `{ ok, main: [segA, segB], branch: segC, colinearityScore }`
  - Invariant to segment ordering

### Updated `GraphTranslator.js`
When processing tee nodes, replace order-dependent logic with `classifyTeeMainBranch()`.

Store result metadata:
- `MAIN_SEGMENT_A` — first main segment
- `MAIN_SEGMENT_B` — second main segment
- `BRANCH_SEGMENT` — branch segment
- `TEE_CLASSIFICATION` — always `'VECTOR_COLINEARITY'`

Add new exported function:
- `buildComponentsFromGraphWithDiagnostics(nodes, segments)` — returns `{ components, diagnostics, topologyValidation }`

## Testing
- `scripts/u4-sketcher-topology-check.mjs` — static export verification
- `scripts/u4-sketcher-topology-behavior-test.mjs` — topology behavior and classification invariance

## Certification Commands
```bash
npm run check:u4
npm run check:u4:behavior
npm run ci:u4
```

## Backward Compatibility
Existing `buildComponentsFromGraph()` remains unchanged and functional.
