# Phase U5: Solver Certification Contract

## Problem
Simplified 2D and other solvers returned inconsistent result shapes, making it difficult to:
- Validate solver output across modules
- Track engineering level (MOCK, SCREENING, BENCHMARKED_SCREENING, CERTIFIED)
- Trace formula IDs and methodology
- Propagate diagnostics and warnings consistently

## Solution
Introduce a standardized solver result contract wrapping all solver outputs:

```
{
  schemaVersion: 'solver-result-contract-v1',
  moduleId: 'simplified-2d',
  methodId: 'SIMPLIFIED_2D_L_SHAPE',
  formulaIds: ['F1', 'F2'],
  engineeringLevel: 'BENCHMARKED_SCREENING',
  status: 'PASSED',
  results: { /* original solver output */ },
  unitSystem: { length: 'in', force: 'lbf', ... },
  diagnostics: [],
  warnings: [],
  formulaTrace: [],
  meta: {},
  summary: { ... }
}
```

## Key Exports

**src/core/solvers/certification/solverResultContract.js**

- `SOLVER_RESULT_SCHEMA_VERSION` — 'solver-result-contract-v1'
- `ENGINEERING_LEVEL` — freeze({ MOCK, SCREENING, BENCHMARKED_SCREENING, CERTIFIED })
- `createSolverResultContract(payload)` — Creates frozen contract with defaults and normalization
- `validateSolverResultContract(result)` — Validates structure, returns { ok, errors }
- `unwrapSolverResults(result)` — Extracts `result.results` if contract, else returns result

## Implementation Notes

### Simplified 2D Solver (`src/core/solvers/simplified2d/solveSimplified2D.js`)

The solver now wraps its legacy result in `createSolverResultContract()`:

```javascript
- moduleId: 'simplified-2d'
- engineeringLevel: ENGINEERING_LEVEL.BENCHMARKED_SCREENING
- methodId: Determined from classification.geometryType:
  - 'SIMPLIFIED_2D_EMPTY' (default fallback)
  - 'SIMPLIFIED_2D_SINGLE_LEG'
  - 'SIMPLIFIED_2D_STRAIGHT_RUN'
  - 'SIMPLIFIED_2D_L_SHAPE'
  - 'SIMPLIFIED_2D_Z_SHAPE'
  - 'SIMPLIFIED_2D_LOOP_OR_MULTI_LEG'
  - 'SIMPLIFIED_2D_OFFSET'
  - 'SIMPLIFIED_2D_MULTI_LEG'
- results: { original result object }
- status: inherited from result.status
```

### Certification Scripts

**scripts/u5-solver-certification-check.mjs**
- Verifies contract module exports exist
- Checks solver file contains 'solver-result-contract-v1' marker
- Exit 0 on pass, exit 1 with messages on fail

**scripts/u5-solver-certification-behavior-test.mjs**
- Tests createSolverResultContract with valid inputs → validates ok
- Tests missing moduleId → uses fallback 'unknown-module'
- Tests validateSolverResultContract on valid/invalid inputs
- Tests unwrapSolverResults extracts results correctly
- Tests ENGINEERING_LEVEL constants exist
- Exit 1 on any failure

### Package.json Updates

```json
"check:u5": "node scripts/u5-solver-certification-check.mjs",
"check:u5:behavior": "node scripts/u5-solver-certification-behavior-test.mjs",
"ci:u5": "npm run ci:u4 && npm run check:u5 && npm run check:u5:behavior && npm run check:benchmarks"
```

## Testing

```bash
npm run check:u5
npm run check:u5:behavior
npm run check:benchmarks
npm run ci:u5
```

## Deferred

- Convert GC3D, Pipe Rack, Calc Extended, and reporting exports to full contract
- Add benchmark-runner schema validation
- Add formula-specific 2D L/Z/U/offset equations
- Add certification badges
- Active report integration in U6
