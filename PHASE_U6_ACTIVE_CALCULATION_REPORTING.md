# Phase U6: Active Calculation Reporting

## Overview
Implements active report context publishing from solver modules. When a calculation completes (in calc-extended or other modules), the result is published to the app store and displayed in the Reports tab instead of a demo report.

## Core Changes

### State Management (appStore.js)
- Added `activeReportContext`: Holds the current calculation's report data
- Added `reportContextSequence`: Tracks number of report updates
- Added `setActiveReportContext()`: Updates the active report context and increments sequence
- Added `clearActiveReportContext()`: Clears the active report (for reset scenarios)

### Report Context Publishing
- `src/reporting/publishActiveReportContext.js`: Normalizes solver results and publishes to store
  - `buildActiveReportContext()`: Creates normalized context from solver payload
  - `publishActiveReportContext()`: Stores the context in appStore

### Report Payload Builder
- `src/reporting/buildReportPayload.js`: Pure JS module (no JSX imports) that builds display payload
  - Handles stale results warning
  - Normalizes status from multiple possible result shapes
  - Aggregates warnings and diagnostics

### UI Updates (ReportsTab.jsx)
- Replaced demo/mock report rendering with active context display
- Shows "No active calculation report" when none available
- Displays stale results warning if `resultsStale` flag is set
- Renders active report when context is available

### Solver Integration (DashboardView.jsx)
- After `runExtendedSolver()` succeeds, calls `publishActiveReportContext()`
- Passes solver result, input payload, settings, and benchmark status
- Uses `fallbackMethodId` for methodology-based method naming

## Testing
- `scripts/u6-active-reporting-check.mjs`: Validates file exports and store structure
- `scripts/u6-active-reporting-behavior-test.mjs`: Tests `buildReportPayload()` behavior
- npm scripts: `check:u6`, `check:u6:behavior`, `ci:u6`

## Key Types

### activeReportContext
```
{
  schemaVersion: 'active-report-context-v1',
  moduleId: string,
  methodId: string,
  title: string,
  input: object,
  result: object (solver result),
  settings: object,
  settingsHash: string | null,
  diagnostics: array,
  warnings: array,
  benchmarkStatus: string,
}
```

### reportPayload
Built from activeReportContext for display:
- title, module, status, methodId, formulaIds
- unitSystem, benchmarkStatus
- input, result, settings
- engineeringDataSource, warnings, diagnostics
- substitutions (settingsHash, createdSequence)
