# Phase V10: Full Engineering Data Migration

**Objective:** Complete the engineering-data migration started in U3, removing fallback approximations and unifying pipe/material lookups through the engineering-data resolver.

## Changes

### Core Updates

1. **resolveEngineeringData.js**
   - Added `INCH_TO_MM` constant (25.4)
   - Added `normalizePipeValue()` function to compute derived dimensions from raw pipe data
   - Updated `resolvePipeSection()` to normalize returned values with metric conversions

2. **pipeSchedules.js**
   - Added DN→NPS mapping for international standard bore sizes
   - Implemented `resolvePipeDimensions(boreMm, schedule)` for unified pipe resolution
   - Updated `getPipeDimensions(boreMm, schedule)` to call `resolvePipeDimensions()`
   - Updated `getAvailableSchedules()` to return `[]` for unmapped bore sizes (strict behavior)
   - **Removed** unsafe fallback approximation (`od = boreMm; wt = boreMm * 0.065`)

3. **publishActiveReportContext.js**
   - Added `dataStatus` field to report context
   - Added `engineeringDataSource` field to report context

4. **buildReportPayload.js**
   - Already contains `engineeringDataSource` field (verified)

### Behavior Tests

Two new scripts validate the migration:

- **scripts/v10-engineering-data-migration-check.mjs**
  - Static checks for required functions and removals
  - Validates INCH_TO_MM, normalizePipeValue, resolvePipeDimensions
  - Ensures unsafe fallback is removed

- **scripts/v10-engineering-data-migration-behavior-test.mjs**
  - Functional tests for pipe and material resolution
  - Tests DN→NPS mapping and missing-data behavior
  - Validates normalized dimensions (od_mm, wt_mm)

### Package.json Scripts

```json
"check:v10": "node scripts/v10-engineering-data-migration-check.mjs"
"check:v10:behavior": "node scripts/v10-engineering-data-migration-behavior-test.mjs"
"ci:v10": "npm run ci:v9 && npm run check:v10 && npm run check:v10:behavior && npm run check:benchmarks && npm run build"
```

## Certification

```bash
npm run check:v10
npm run check:v10:behavior
npm run check:benchmarks
npm run ci:v10
```

## Benefits

- **Strict Data Handling:** Unknown pipe sizes no longer produce approximations
- **Unified Resolver:** All pipe/material lookups go through engineering-data layer
- **Qualified Data:** Report payload carries engineering data status and source
- **Metric Conversion:** Pipe dimensions automatically converted to mm for 3D use
- **Diagnostic Traceability:** Missing data is tracked with diagnostic codes and messages
