# Phase V14: Component Master DB and Fitting Dimensions

## Overview

Phase V14 introduces a component master database layer and fitting dimension resolvers to provide engineering-grade dimensional data for piping components. This enables more accurate screening analysis and establishes the foundation for project-specific component data integration.

## Key Features

### 1. Component Master Database
- Centralized repository of component dimensions organized by type, size, and rating
- Support for standard component types: elbows, tees, weldolets, valves, flanges
- Multiple source status tracking: VERIFIED, SCREENING_SAMPLE, USER_DEFINED, MISSING_COMPONENT_DATA
- All initial rows are screening samples and require verification against project-approved data

### 2. Fitting Dimension Resolvers
- `resolveElbowC2E()`: Center-to-end distances for elbows (90° and 45°)
- `resolveTeeC2E()`: Center-to-end distances for tee runs and branches
- `resolveOletBRLEN()`: Branch length for weldolet fittings
- `resolveValveFaceToFace()`: Face-to-face distances for valves
- `resolveFlangeThickness()`: Flange thickness dimensions

All resolvers return a standardized result contract with status, qualification, source tracking, and diagnostics.

### 3. Sketcher Integration
Professional drafting commands (bend, tee, olet conversion) now accept a `componentDataResolver` parameter to attach component data to converted nodes during sketcher operations.

### 4. Branch Screening Integration
Branch analysis now attempts to resolve component data (specifically BRLEN) from the component master DB when direct fitting data is not provided, enabling more comprehensive branch screening.

### 5. Report Issue Blocking
Reports cannot be issued when component data status is MISSING_COMPONENT_DATA or NOT_QUALIFIED, preventing engineering issue escalation before component data is available.

## Data Governance

**IMPORTANT:** All initial component master DB rows are SCREENING_SAMPLE records only. They are representative values from industry standards and do not substitute for:
- Project-approved component master databases
- Vendor datasheets
- ASME specifications
- Customer-supplied component lists

Before issuing final reports, all component dimensions must be verified against the project's approved component master database.

## Files

### New
- `src/data/componentMasterDb/defaultComponentMasterDb.js` - Master DB schema and default rows
- `src/core/component-data/resolveComponentDimensions.js` - Dimension resolver functions
- `src/components/ComponentMasterDbTab.jsx` - UI for viewing/editing component DB
- `scripts/v14-component-master-db-check.mjs` - Static validation checks
- `scripts/v14-component-master-db-behavior-test.mjs` - Behavioral tests

### Modified
- `src/sketcher/commands/professionalDraftingCommands.js` - Added componentDataResolver support
- `src/core/solvers/branch/solveBranchScreening.js` - Added component data resolution
- `src/reporting/reportIssueWorkflow.js` - Added component data issue blocking
- `src/reporting/publishActiveReportContext.js` - Added componentDataStatus propagation
- `src/reporting/buildReportPayload.js` - Added componentDataStatus to payload
- `package.json` - Added V14 check scripts and CI pipeline

## Testing

Run the certification suite:
```bash
npm run check:v14
npm run check:v14:behavior
npm run check:benchmarks
npm run build
```

Or full CI pipeline:
```bash
npm run ci:v14
```

## Schema Versions

- `component-master-db-v1`: Master database schema
- `component-dimension-resolution-v1`: Dimension resolver result contract

## Future Phases

- V15: PCF/PCFX fitting roundtrip QA
- V16: Production PCF/PCFX import-export with golden fixtures
- Excel import for component master DB
- Exact bend tangent trimming by C2E
- Tee header/branch split by C2E
- Valve/flange symbol scaling by dimensions
