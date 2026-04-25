# Phase 4 Report — Canonical GC3D + Calc Extended Handoff

**Phase:** 4  
**Status:** Implemented for source review package  
**Date:** 2026-04-25  

## Objective

Consolidate the active 3D calculation path and connect Calc Extended to the canonical geometry contract introduced in Phases 2–3.

## Completed

### 1. Retired duplicate GC3D implementation

- Removed active duplicate folder: `src/gc3d`
- Kept `src/3d-analysis` as the only active 3D analysis UI path.
- Added canonical core GC3D solver under `src/core/solvers/gc3d/`.

### 2. Made GC3D deterministic

- `src/core/solvers/gc3d/solveGC3D.js` no longer uses `Date.now()`.
- Solver debug logs use deterministic sequence IDs such as `gc3d-000`.
- `src/3d-analysis/AnalysisStore.js` no longer uses `Date.now()` for UI log entries.
- Segment split node IDs now use deterministic `N_SPLIT_<segment>_<counter>` IDs.
- Removed `console.time()` / `console.timeEnd()` from production GC3D run path.

### 3. Added canonical geometry adapters

Added:

```text
src/core/geometry/adapters/canonicalToGC3D.js
src/core/geometry/adapters/canonicalToExtended.js
```

### 4. Connected Calc Extended to canonical geometry

`CalcExtendedTab` no longer reads non-existent `appStore.nodes` / `appStore.segments`.

It now consumes:

```text
useAppStore(state => state.activeCanonicalGeometry)
```

and hydrates Calc Extended via:

```text
importFromCanonicalGeometry(activeCanonicalGeometry)
```

### 5. Improved Extended Solver traceability

`src/calc-extended/solver/ExtendedSolver.js` now returns:

- `warnings`
- `formulaTrace`
- `assumptions`
- `meta.schemaVersion = extended-calc-v1`

Fallback database lookups now add warnings instead of silently defaulting.

### 6. Fixed visible UX routing concern

Top navigation now exposes `Simplified 2D Screening`. SPL2 is labelled `SPL2 Legacy Benchmark`.

### 7. Improved syntax QA path

`@babel/parser` was added to devDependencies and package-lock root metadata.

Scripts now include:

```json
"syntax": "node scripts/syntax-check.mjs",
"syntax:strict": "node scripts/syntax-check.mjs --strict",
"check": "npm run syntax && npm run test",
"check:full": "npm run syntax:strict && npm run lint && npm run test && npm run build"
```

Dependency-free syntax fallback still works for ZIP review, while strict JSX/Babel parse is available after `npm install`.

## Checks performed in sandbox

```text
node scripts/syntax-check.mjs  ✅ passed
node scripts/smoke-check.mjs   ✅ passed
npm run syntax                 ✅ returned status 0
```

`npm run check` displayed successful execution of both `npm run syntax` and `npm run test`, but the sandbox wrapper did not return control before the tool timeout. The underlying subcommands were verified independently with direct Node execution. Re-run locally after dependency install:

```bash
npm install
npm run check
npm run check:full
```

## Remaining limitations intentionally deferred

1. Full JSX/Babel parse requires `npm install` so `@babel/parser` is present.
2. Full Vite build and ESLint QA require installed dependencies.
3. Simplified 2D remains screening-level only and still needs SPL2/workbook benchmark parity.
4. `src/calc-extended/adv-piperack` remains for Phase 5 pipe-rack consolidation.
5. SPL2 iframe remains as a legacy benchmark oracle.
