# Module Finalization Matrix

This document outlines the final module registry and status matrix for the Phase 6 freeze.

## ACTIVE Modules

| Module ID | Display Name | Engineering Level | Owner Tab | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `core-geometry` | Canonical Geometry | `DATA_INTERFACE` | Geometry | Canonical geometry backbone |
| `pcf-interface` | PCF Import/Export | `DATA_INTERFACE` | PCF Import | Data interface layer |
| `2d-simplified-stress-check` | 2D Simplified Stress Check | `SCREENING` | 2D Simplified Stress Check | Screening module |
| `3d-guided-cantilever` | 3D Guided Cantilever | `SCREENING` | 3D Guided Cantilever | Screening module |
| `piperack-expansion-loop` | Pipe Rack & Expansion Loop | `DESIGN_AID` | Pipe Rack & Expansion Loop | Design aid + screening module |
| `reporting` | Reporting | `DATA_INTERFACE` | Reports | Engineering report export |
| `benchmark-validation` | Benchmark/Validation | `DATA_INTERFACE` | Benchmarks / Validation | Numeric QA and regression |
| `settings-defaults` | Settings/Defaults | `DATA_INTERFACE` | Settings / Defaults | App configuration |

## REFERENCE Modules

| Module ID | Display Name | Engineering Level | Notes |
| :--- | :--- | :--- | :--- |
| `spl2-bundle` | SPL2 Bundle | `REFERENCE` | Legacy reference / benchmark only |

## REMOVED Modules (Forbidden)

| Module ID | Legacy Path | Replacement For | Notes |
| :--- | :--- | :--- | :--- |
| `gc3d-legacy` | `src/gc3d` | `3d-guided-cantilever` | Removed in previous phase |
| `adv-piperack-legacy` | `src/calc-extended/adv-piperack` | `piperack-expansion-loop` | Removed duplicate module |
| `simp-analysis-legacy` | `src/simp-analysis` | `2d-simplified-stress-check` | Old product surface |
| `extended-solver-legacy` | `src/3d-analysis/ExtendedSolver.js` | `3d-guided-cantilever` | Removed logic file |
