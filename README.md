# Simplified Calc Suite

## Engineering Safety Note
This calculation is a simplified screening/design-aid calculation. It is not a replacement for formal code-compliant pipe stress analysis. None of the modules claim to perform formal code-compliant pipe stress program analysis. Calculation outputs must not contain demo/random values. Every solver must expose formulas, assumptions, units, applicability limits, and warnings.

## Workflow Guide
PCF Import → Geometry → 2D Calc → 3D Calc → PipeRack → Report

## Final Module List and Status
* **Active modules:** Canonical Geometry, PCF import/export, 2D Simplified Stress Check, 3D Guided Cantilever, Pipe Rack & Expansion Loop, Reporting, Benchmark/Validation, Settings/Defaults.
* **Reference-only modules:** SPL2 Bundle (legacy reference / benchmark only).
* **Removed modules:** `src/gc3d`, `src/calc-extended/adv-piperack`, old product-surface `src/simp-analysis`, `src/3d-analysis/ExtendedSolver.js`

## Benchmark Status
PENDING_NUMERIC_EXTRACTION
Benchmarks have not been run or numeric fixtures are pending.

## Build/Test Commands
```bash
npm install
npm run syntax
npm run test
npm run check
npm run syntax:strict
npm run lint
npm run build
npm run check:full
```

## Final Release Decision
* **SOURCE COMPLETE:** NO
* **BUILD VERIFIED:** NO
* **UI SMOKE VERIFIED:** NO
* **ENGINEERING BENCHMARK VERIFIED:** NO

## Known Limitations
* Must not be considered full CAESAR II-like stress analysis.
* All mathematical output should be considered "Screening," "Design Aid," or "Reference."
* Must not reintroduce removed modules or use `Math.random()` in calculations.
