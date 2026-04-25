# Phase 5 — Pipe Rack, Reporting, SPL2 Benchmarks, and Final Cleanup Report

**Date:** 2026-04-25  
**Package:** `Simplified_Analysis_Phase5_PipeRack_Reporting_SPL2_Cleanup.zip`  
**Scope:** Final consolidation phase after canonical GC3D / Extended Calc work.

---

## 1. Executive Summary

Phase 5 completes the duplicate-module rationalization path by making `src/piperack` the only active pipe-rack module, retiring the duplicate `src/calc-extended/adv-piperack` implementation, adding a shared reporting/export layer, and formalizing SPL2 as a legacy benchmark source rather than a future development target.

The application now follows this high-level ownership model:

```text
PCF / Sketcher / Transform
  ↓
Canonical Geometry
  ↓
Simplified 2D | GC3D | Calc Extended | Pipe Rack
  ↓
Shared Report / JSON / CSV Export
```

---

## 2. Files Added

```text
src/core/geometry/adapters/canonicalToPipeRack.js
src/core/solvers/piperack/dbUtils.js
src/core/solvers/piperack/index.js
src/core/solvers/piperack/solveLineSpacing.js
src/core/solvers/piperack/solvePipeRack.js
src/core/solvers/piperack/solveRackLayout.js
src/core/solvers/piperack/solveRackLoopOrder.js
src/core/reporting/createCalculationReport.js
src/core/reporting/exportCsvTables.js
src/core/reporting/exportJsonSnapshot.js
src/core/reporting/exportMarkdownReport.js
src/core/reporting/index.js
src/fixtures/spl2-benchmarks/case-001-l-bend.json
src/fixtures/spl2-benchmarks/case-002-z-bend.json
src/fixtures/spl2-benchmarks/case-003-loop.json
PHASE5_PIPE_RACK_REPORTING_SPL2_CLEANUP_REPORT.md
```

---

## 3. Files Updated

```text
src/config/version.js
src/calc-extended/components/CalcExtendedTab.jsx
src/piperack/solver/PipeRackSolver.js
src/piperack/solver/AdvancedLayoutSolver.js
src/piperack/store/usePipeRackStore.js
src/piperack/components/RackResultsGrid.jsx
scripts/smoke-check.mjs
Tasks.md
```

---

## 4. Duplicate Module Retirement

### Retired

```text
src/calc-extended/adv-piperack
```

### Reason

The project already had an official pipe-rack module under:

```text
src/piperack
```

Keeping both active would produce competing stores, competing layout solvers, and contradictory UI behavior.

### Result

`CalcExtendedTab.jsx` now exposes only the official `Pipe Rack Calc` path and no longer imports or renders `Adv_PR_Main`.

---

## 5. Pipe Rack Consolidation

The feature-level pipe-rack solver files now delegate to canonical core solver files:

```text
src/piperack/solver/PipeRackSolver.js          -> src/core/solvers/piperack/solvePipeRack.js
src/piperack/solver/AdvancedLayoutSolver.js   -> src/core/solvers/piperack/solveRackLayout.js
```

The new canonical pipe-rack core includes:

- loop-order calculation
- material/pipe property lookup with explicit fallback warnings
- simplified loop sizing
- layout/tier/future-slot calculation
- spacing summary helper
- approximation warnings for MIST/nozzle-like checks

---

## 6. Reporting Layer

A shared reporting layer was added under:

```text
src/core/reporting
```

It supports:

- `createCalculationReport(...)`
- `reportToMarkdown(...)`
- `exportMarkdownReport(...)`
- `exportJsonSnapshot(...)`
- `rowsToCsv(...)`
- `exportCsvTables(...)`

Pipe Rack results now expose **Export MD** and **Export JSON** buttons from the results grid.

---

## 7. SPL2 Benchmark Strategy

SPL2 remains active only as:

```text
SPL2 Legacy Benchmark
```

Phase 5 added fixture shells under:

```text
src/fixtures/spl2-benchmarks
```

These fixtures intentionally mark expected results as `PENDING_NUMERIC_EXTRACTION`. They formalize the future benchmark contract without falsely claiming parity against SPL2/workbooks.

---

## 8. Checks Performed

```text
node scripts/syntax-check.mjs  ✅ passed
node scripts/smoke-check.mjs   ✅ passed
npm run check                  ✅ passed
```

### Important QA Note

`npm run syntax:strict` could not be completed in this sandbox because `@babel/parser` was unavailable without a complete `npm install`. A timed `npm install` attempt did not complete within the sandbox limit. The delivery ZIP excludes `node_modules`, so final local QA should run:

```bash
npm install
npm run syntax:strict
npm run check:full
```

---

## 9. Known Remaining Engineering Limitations

1. Simplified 2D remains screening-level only until benchmark parity is filled from SPL2/workbooks.
2. SPL2 benchmark fixture expected values are placeholders pending numeric extraction.
3. Pipe-rack MIST/nozzle interaction remains an approximation and is explicitly warned in result payloads.
4. Full browser UI smoke through Playwright was not performed in the sandbox.
5. The project still contains older root benchmark files that should be rationalized into `src/fixtures` or `Docs` later.

---

## 10. Phase 5 Acceptance

Phase 5 is acceptable for code review because:

- duplicate `adv-piperack` active code is removed;
- official pipe rack path is canonicalized through `src/core/solvers/piperack`;
- shared report export utilities exist;
- SPL2 benchmark fixtures now have a formal machine-readable home;
- `npm run check` passes with dependency-free syntax fallback plus smoke test.
