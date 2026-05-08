# Simplified Analysis — Phase U1 Workflow Hardening

## Scope

Phase U1 starts the workflow-hardening upgrade after the Phase U0 baseline certification pack. This patch targets the highest-risk navigation failures found in the audit without expanding solver formulas or changing engineering data governance.

## Implemented fixes

### U1-01 — Viewer route alias

Problem: Sketcher sync workflow can set the active tab to `viewer`, while `App.jsx` previously rendered the 3D viewer only for `home`. This could leave the application with no visible tab content after a sync action.

Fix: `App.jsx` now treats both `home` and `viewer` as valid viewer tab IDs:

```js
const isViewerTab = activeTab === 'home' || activeTab === 'viewer';
{isViewerTab && <Viewer3DTab />}
```

Result: existing calls to either `setActiveTab('home')` or `setActiveTab('viewer')` render `Viewer3DTab` and cannot produce a blank route.

### U1-02 — Sketcher Analyze 2D handoff opens the 2D solver subtab

Problem: Sketcher `Analyze 2D` stores a `simplified-2d-v1` payload and navigates to `simpAnalysis`, but `CalcExtendedTab` defaults to the 3D solver subtab. The user request was for 2D analysis, so landing on 3D is confusing.

Fix: `CalcExtendedTab.jsx` now detects a simplified 2D payload from either `analysisPayload` or `simplifiedGeometry` and forces `activeSubTab` to `2d`.

Result: Sketcher → Analyze 2D routes to the visible 2D solver view.

### U1-03 — GC3D preflight for unsupported Sketcher topology

Problem: Sketcher can create tee/branch/olet-style topology, while deterministic GC3D screening is not a branch-aware solver. Previously, that workflow could push unsupported geometry into GC3D and rely on the downstream solver to reject it.

Fix: `AnalysisStore.js` now defines a Sketcher-to-GC3D preflight path:

```js
const UNSUPPORTED_GC3D_SKETCHER_NODE_TYPES = new Set(['tee', 'branch', 'olet']);
const UNSUPPORTED_GC3D_SKETCHER_SEGMENT_TYPES = new Set(['TEE', 'BRANCH', 'OLET']);
```

The preflight returns `UNSUPPORTED_GEOMETRY` with a deterministic `GC3D_PREFLIGHT` diagnostic when unsupported topology is detected.

Result: unsupported branch/tee/olet geometry is explicitly identified before GC3D result tables are populated.

### U1-04 — Static workflow guard

Added and extended `scripts/u1-workflow-check.mjs` and package scripts:

```bash
npm run check:u1
npm run ci:u1
```

The static guard verifies:

- `App.jsx` renders the viewer for both `home` and `viewer` tab IDs;
- `CalcExtendedTab.jsx` detects `simplified-2d-v1` payloads;
- `CalcExtendedTab.jsx` forces the 2D subtab for Sketcher analysis handoff;
- `AnalysisStore.js` defines unsupported tee/branch/olet preflight sets;
- `AnalysisStore.js` returns `UNSUPPORTED_GEOMETRY` and writes a `GC3D_PREFLIGHT` diagnostic;
- `AnalysisStore.js` returns the preflight result instead of silently continuing.

## U1 certification commands

```bash
npm install
npm run check:full
npm run check:qa
npm run check:u0
npm run check:u1
npm run build
npm run ci:u1
```

## Deferred U1 items

The following U1 items are still pending and should be implemented in the next U1 patch:

1. Add a visible Sketcher workflow status banner.
2. Replace alert-only workflow feedback with non-blocking diagnostics.
3. Add browser-level Playwright tests for Sketcher → Sync 3D and Sketcher → Analyze 2D.
4. Fix Sketcher fitting connected-bore lookup in `GraphRenderer`.
5. Show the GC3D preflight diagnostic directly in Sketcher before navigation.

## Pass criteria for this patch

- `npm run check:u1` returns zero.
- `npm run ci:u1` returns zero in a dependency-installed environment.
- Existing benchmark baseline remains unchanged through `npm run check:u0`.
