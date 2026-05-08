# Phase U3: Engineering Data Unification

## Objective

Create a unified engineering-data resolver around existing pipe and material data sources so solvers stop using scattered, silent fallback values.

## Overview

Phase U3 introduces a centralized data resolution contract that wraps existing pipe and material property lookups and enforces strict data status propagation. Unknown pipes or materials are now explicitly marked as `MISSING_DATA` or `NOT_QUALIFIED` rather than silently passing with fallback values.

## Core Modules

### `src/core/engineering-data/resolveEngineeringData.js`

Unified resolver module that provides three main functions:

- **`resolvePipeSection({ nps, schedule })`**: Resolves pipe properties for a given nominal pipe size and schedule. Returns a result object with status, qualification, source, and diagnostics.

- **`resolveMaterialAtTemperature({ materialId, temperature_F })`**: Resolves material properties at a specific temperature. Returns a result object with status, qualification, interpolated values, and diagnostics.

- **`resolveEngineeringDataForCalculation({ nps, schedule, materialId, temperature_F })`**: Combines both pipe and material resolution, returning a unified result with full qualification status.

### Status Contract

The module exports a `DATA_STATUS` object with these key values:

- `PASSED` — Data found and qualified
- `MISSING_DATA` — Required data not available
- `NOT_QUALIFIED` — Data exists but requires alternative method
- `SCREENING_APPROXIMATION` — Data available but flagged as approximate
- `USER_DEFINED` — User-supplied override value

## Result Shape

All resolver functions return objects with this contract:

```javascript
{
  status: 'PASSED' | 'MISSING_DATA' | 'NOT_QUALIFIED' | 'SCREENING_APPROXIMATION' | 'USER_DEFINED',
  isQualified: boolean,
  source: string,
  value: object | null,
  diagnostics: Array<{ code, severity, message }>
}
```

## Certification Tests

### Static Verification (`scripts/u3-engineering-data-check.mjs`)

Verifies that the module exports all required symbols:
- `DATA_STATUS`
- `resolvePipeSection`
- `resolveMaterialAtTemperature`
- `resolveEngineeringDataForCalculation`

### Behavior Tests (`scripts/u3-engineering-data-behavior-test.mjs`)

Validates critical data resolution paths:
- Known pipe (NPS 8, Schedule 40) returns `PASSED`
- Unknown pipe (NPS 999, Schedule XXS) returns `MISSING_DATA`
- Known material (Carbon Steel, 300°F) returns `PASSED`
- Unknown material (Unobtanium, 300°F) returns `MISSING_DATA`

## Usage

```javascript
import {
  DATA_STATUS,
  resolvePipeSection,
  resolveMaterialAtTemperature,
  resolveEngineeringDataForCalculation,
} from './src/core/engineering-data/resolveEngineeringData.js';

// Resolve pipe section
const pipeResult = resolvePipeSection({ nps: 8, schedule: '40' });
if (pipeResult.status === DATA_STATUS.PASSED) {
  console.log(`Pipe I = ${pipeResult.value.I_in4}`);
} else {
  console.error(`Pipe resolution failed: ${pipeResult.diagnostics[0].message}`);
}

// Resolve material at temperature
const materialResult = resolveMaterialAtTemperature({
  materialId: 'Carbon Steel',
  temperature_F: 300,
});

// Combined resolution
const fullResult = resolveEngineeringDataForCalculation({
  nps: 8,
  schedule: '40',
  materialId: 'Carbon Steel',
  temperature_F: 300,
});

if (fullResult.isFullyQualified) {
  // Proceed with calculation
  const { pipe, material } = fullResult;
  // use pipe.I_in4, material.E_psi, etc.
}
```

## Package Scripts

- `npm run check:u3` — Static module verification
- `npm run check:u3:behavior` — Behavior test suite
- `npm run ci:u3` — Full Phase U3 certification (including benchmarks)

## Related Phases

- **Phase U2**: Settings contract (prerequisite)
- **Phase U4**: Sketcher topology and fitting upgrade
- **Phase U5**: Solver certification contract
