# Architecture Freeze - Phase 6

This document captures the finalized architecture logic implemented in Phase 6 of the Simplified Analysis project.

## Core Rules

1.  **Engineering Safety Rule**: The application does *not* claim to be a code-compliant pipe stress program. The remaining solvers are labeled as `Screening`, `Design Aid`, `Reference`, or `Data Interface`. Random value generation (`Math.random()`) in engineering outputs is strictly prohibited.
2.  **Canonical Backbone**: The application relies heavily on `src/core/geometry` as the fundamental data structure enabling unified calculations among the certified solver paths.
3.  **Module Registry**: A single source of truth (`src/config/moduleRegistry.js`) explicitly controls the allowed modules.

## Forbidden Reintroductions

To maintain the source consolidation achieved over the previous five phases, several legacy duplicate modules have been permanently purged. Their `paths` are explicitly checked by the validation script (`scripts/validate-module-registry.mjs`), which fails the build if any of them return to the tree.

**The following files/folders MUST NOT be reintroduced:**

*   `src/gc3d` - Duplicate 3D logic.
*   `src/calc-extended/adv-piperack` - Duplicate advanced pipe rack tool.
*   `src/simp-analysis` - Old legacy surface representing earlier un-consolidated calculations.
*   `src/3d-analysis/ExtendedSolver.js` - Older logic that has been replaced.

All functionality previously residing in those scopes is now handled by the certified solver paths (`2d-simplified-stress-check`, `3d-guided-cantilever`, `piperack-expansion-loop`).
