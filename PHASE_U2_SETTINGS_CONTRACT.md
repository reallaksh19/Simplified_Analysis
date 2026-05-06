# Simplified Analysis — Phase U2 Settings Contract

## Scope

Phase U2 begins the migration from scattered module defaults to a single resolved engineering settings contract. This patch intentionally focuses on deterministic settings resolution, Settings UI exposure, app-store ownership, and Calc Extended hydration. It does not yet migrate every solver/store.

## Implemented fixes

### U2-01 — Deterministic settings resolver

Added `src/core/settings/resolveEngineeringSettings.js`.

The resolver provides:

- canonical JSON serialization with sorted keys;
- deterministic FNV-1a settings hash;
- merge order: default settings → app engineering defaults → module overrides → fixture overrides → user overrides;
- numeric/boolean normalization;
- derived values:
  - `deltaT_F`;
  - `calcExtendedUnitSystem`;
  - `schemaVersion: engineering-settings-v1`.

### U2-02 — Expanded authoritative defaults

Expanded `DEFAULT_ENGINEERING_SETTINGS` to cover defaults previously scattered through module stores:

- Sketcher defaults:
  - `defaultDesignTemperature_F`;
  - `defaultPipeBore_mm`.
- Calc Extended defaults:
  - `defaultInstallTemperature_F`;
  - `defaultPipeSize_in`;
  - `defaultSchedule`;
  - `defaultMaterial`;
  - `extendedCorrosionAllowance_in`;
  - `extendedMillTolerance_pct`.
- GC3D defaults:
  - `gc3dGridSnap_mm`;
  - `gc3dDeltaT_F`;
  - `gc3dE_psi`;
  - `gc3dAlpha_in_in_F`;
  - `gc3dSc_psi`;
  - `gc3dSh_psi`;
  - `gc3dCycleFactor`;
  - `gc3dSa_psi`.

### U2-03 — App-store resolved settings ownership

`src/store/appStore.js` now owns:

- `engineeringDefaults` seeded from `DEFAULT_ENGINEERING_SETTINGS`;
- `resolvedEngineeringSettings`;
- `getResolvedEngineeringSettings()` selector;
- settings recalculation on `setEngineeringDefault` and `setEngineeringDefaults`;
- benchmark/fixture override resolution during `loadBenchmarkMock`.

### U2-04 — Settings UI contract display

`src/settings/SettingsTab.jsx` now exposes the expanded settings groups and displays the resolved contract schema/hash.

### U2-05 — Calc Extended settings hydration

`src/calc-extended/store/useExtendedStore.js` now:

- applies resolved settings to unit system and default inputs;
- stores `engineeringSettingsHash`;
- exposes `hydrateEngineeringSettings()`;
- applies resolved settings on reset/import/mock load.

`DashboardView.jsx` now:

- hydrates the Calc Extended store when the resolved settings hash changes;
- passes `settings` and `settingsHash` into `runExtendedSolver` payload;
- records `settingsHash` in result metadata.

### U2-06 — Static certification guard

Added `scripts/u2-settings-contract-check.mjs` and package scripts:

```bash
npm run check:u2
npm run ci:u2
```

The static guard verifies the resolver, app-store, settings UI, and Calc Extended wiring.

## Certification commands

```bash
npm ci
npm run check:full
npm run check:qa
npm run check:u0
npm run check:u1
npm run check:u2
npm run build
npm run ci:u2
```

## Deferred U2 items

The following work remains for subsequent U2 patches:

1. Wire SketcherStore initial defaults and reset behavior to resolved settings.
2. Wire AnalysisStore / GC3D params and grid snap to resolved settings.
3. Wire Pipe Rack defaults to resolved settings.
4. Parameterize ExtendedSolver `shortDropLimit_ft` from `payload.settings.shortDropLimit_ft`.
5. Add numeric behavior tests proving settings changes affect solver payload/results.
6. Add browser-level verification that Settings changes mark results stale and hydrate active modules.

## Pass criteria for this patch

- `npm run check:u2` returns zero.
- `npm run ci:u2` returns zero in a dependency-installed environment.
- Existing U0/U1 checks remain green.
- Settings tab shows a deterministic `engineering-settings-v1` hash.
