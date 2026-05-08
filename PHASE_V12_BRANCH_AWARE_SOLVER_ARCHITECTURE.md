# Phase V12: Branch-Aware Solver Architecture

## Overview

Phase V12 introduces a topology-aware solver routing layer that dispatches to domain-specific solvers based on detected geometry patterns.

### Key Design Decisions

- **GC3D remains limited**: GC3D continues to screen only non-branch guided-cantilever geometry.
- **Branch geometry is routed separately**: Tee, olet, and branch components trigger a dedicated branch-screening solver.
- **Non-invasive diagnostics**: Routing decisions are recorded as metadata, allowing callers to understand why a solver was selected or rejected.

## Architecture Components

### 1. Topology Classifier (`classifySolverTopology.js`)

Examines nodes and segments to detect geometry patterns:
- **EMPTY**: No nodes or segments
- **GC3D_SUPPORTED_ROUTE**: No branch/tee/olet components
- **BRANCH_ROUTE**: Contains tee, branch, or olet
- **INVALID_TOPOLOGY**: Fails sketch topology validation
- **UNSUPPORTED_MIXED_TOPOLOGY**: Reserved for future geometry patterns

### 2. Solver Router (`solveByTopologyRouter.js`)

Routes payloads to the appropriate solver:
- GC3D_SUPPORTED_ROUTE → solveGC3D()
- BRANCH_ROUTE → solveBranchScreening()
- EMPTY → NOT_QUALIFIED contract
- Others → UNSUPPORTED_GEOMETRY contract

Supports dependency injection for testing and integration.

### 3. Branch-Screening Solver (`solveBranchScreening.js`)

Performs branch-specific validation:
- Confirms topology is a branch route
- Checks for BRLEN/fitting C2E data per branch
- Returns SCREENING_ONLY status (not qualified for full analysis in V12)
- Records branch classification details for UI display

## API

### `classifySolverTopology(payload)`

```javascript
import { classifySolverTopology, SOLVER_TOPOLOGY_TYPE } from './src/core/solvers/routing/classifySolverTopology.js';

const result = classifySolverTopology({
  nodes: { /* ... */ },
  segments: [ /* ... */ ]
});

if (result.topologyType === SOLVER_TOPOLOGY_TYPE.BRANCH_ROUTE) {
  console.log('Branch geometry detected:', result.branchDetails);
}
```

### `solveByTopologyRouter(payload, options?)`

```javascript
import { solveByTopologyRouter } from './src/core/solvers/routing/solveByTopologyRouter.js';

const result = await solveByTopologyRouter(payload);
console.log(`Selected solver: ${result.routing.selectedSolver}`);
```

### `solveBranchScreening(payload)`

```javascript
import { solveBranchScreening } from './src/core/solvers/branch/solveBranchScreening.js';

const result = solveBranchScreening({
  nodes: { /* ... */ },
  segments: [ /* ... */ ],
  fittingData: {
    branch_seg_id: { BRLEN_in: 12 }
  }
});
```

## Integration with GC3D

The GC3D solver now includes a routing hint when rejecting branch geometry:

```javascript
routingHint: {
  recommendedRouter: 'solveByTopologyRouter',
  branchSolver: 'BRANCH_TOPOLOGY_SCREENING_V1'
}
```

## Verification

Run the certification suite:
```bash
npm run check:v12
npm run check:v12:behavior
npm run check:benchmarks
npm run ci:v12
```

## Known Limitations

- V12 does not perform full branch stress analysis (reserved for future phases).
- BRLEN resolver is a simple data presence check; real computation of branch length and stress factors is deferred.
- No branch reinforcement or nozzle-style dimensioning.
- Branch-screening UI details are deferred.

## Future Phases

- V13: Report export and checker workflow
- V14: Component Master DB with fitting C2E lengths
- V15: Full branch SIF and stress calculation
