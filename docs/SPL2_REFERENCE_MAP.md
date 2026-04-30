# SPL2 Reference Map

This document maps the legacy SPL2 calculations to the active engineering modules in Phase 6.

| Legacy SPL2 Function | Description | Target Active Module | Engineering Level | Status / Action |
| --- | --- | --- | --- | --- |
| `calculateSimplified` | Simplified stress approximation proxy for MW Kellogg | `2d-simplified-stress-check` | SCREENING | **REFERENCE-ONLY**. Do not port directly without documenting the proxy math assumptions. Used for benchmarking. |
| `calculateLoop` | Expansion loop flexibility factors and rough sizing | `piperack-expansion-loop` (Loop Design Aid) | DESIGN_AID / SCREENING | **REFERENCE-ONLY**. Used for cross-checking flexibility factors (h, k, beta) and bend geometry in the new active module. |
| `calculateRackLoad` | Span weights, operating loads, and wind profile | `piperack-expansion-loop` (Rack Span) | DESIGN_AID / SCREENING | **REFERENCE-ONLY**. Port logic is valid for weights and basic statics. Used as a regression benchmark. |

Note: The `spl2-bundle` codebase is officially retired as a primary calculation engine and remains only as a benchmark/reference asset.
