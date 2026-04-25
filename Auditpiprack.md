# Comprehensive Engineering Report vs. Implementation Audit

This document audits the current codebase implementation against the provided "Comprehensive Engineering Report: Advanced Piperack Design & Structural Evaluation Engine" specifications, and specifically addresses the six user observations.

## User Observations Audit

### 1. Insulation thickness is not taken in present flawed pipe rack width calc
**Status: Partially Addressed / Needs Review**
*   **Implementation:** In `AdvancedLayoutSolver.js`, insulation thickness is read via `line.insulationThk`. The width occupied by pipes before inserting the future gap calculates it as `ins_mm = line.insulationThk || 0`. Spacing $S_{pipe}$ calculations do consider `ins_mm` and `prev_ins`.
*   **Gap:** The default line state in `usePipeRackStore.js` sets `insulationThk` to values like `2.0` and `0`. If these are in inches (as the comment suggests `// inches`), they must be multiplied by 25.4 to convert to mm when calculating physical spacing in `AdvancedLayoutSolver.js`. Currently, the solver uses `const ins_mm = line.insulationThk || 0;` directly without converting from inches to mm, meaning a 2.0 inch insulation only adds 2mm to the gap instead of 50.8mm. This causes the width to be severely underestimated.

### 2. Thermal displacement/guide staggering not considered (complex, if even need to consider)
**Status: Partially Addressed**
*   **Implementation:** The code in `AdvancedLayoutSolver.js` calculates thermal displacement `delta_in` and incorporates a bowing effect estimate: `const bowing = Math.max(prev.delta_in, line.delta_in) * 25.4 * 0.15`. Guide hardware spacing is represented as a static 75mm (50mm Guide + 25mm Air Gap). Guide staggering itself (shifting guides axially to avoid clip clashing) is not modeled horizontally, but the spacing formula accounts for a conservative `standardGap`.

### 3. Future space, better to show like cuboid similar to pipe (a slight depth sense)
**Status: Needs Improvement**
*   **Implementation:** In `SectionCanvas.jsx`, the future space is currently rendered as a 2D-like flat wireframe box (`boxGeometry args={[line.gapWidth_mm * scale, 20 * scale, 5 * scale]}`) that doesn't resemble the pipes' representation.
*   **Requirement:** It should be shown as a cuboid or have depth consistent with the pipes.

### 4. Insulated pipe will have shoe, missing in graphics
**Status: Not Addressed**
*   **Implementation:** In `SectionCanvas.jsx` (`PipeCrossSection`), pipes are drawn as simple circles floating directly above the beam: `position={[line.x_mm * scale, line.y_mm * scale + (r + ins) * scale + 1, 0]}`. There is no visual representation of a pipe shoe or support block lifting the pipe off the beam.

### 5. Piperack width adjusting when pipe shifted but without considering gusset
**Status: Needs Improvement / Needs Review**
*   **Implementation:** `AdvancedLayoutSolver.js` calculates `maxCantilever_mm` when a pipe is manually dragged: `const requiredHalfWidth = absX + ((l.OD_in || 0) * 25.4 / 2) + (l.insulationThk || 0) + (structSettings.gussetGap_mm || 100);`.
*   **Gap:** As identified in point #1, `insulationThk` is not multiplied by 25.4, underestimating the required width. Also, when extending the transverse beam, the beam width updates visually but the vertical columns remain fixed, creating a realistic cantilever visual, but the math might be tight if the gusset gap isn't applied to both sides correctly or if the user intends the columns to widen instead of cantilevering.

### 6. Separate out configurable thing, instead of hardcoded logic!
**Status: Partially Addressed**
*   **Implementation:** Many variables have been moved to `usePipeRackStore.js` under `structuralSettings` (e.g., `gussetGap_mm`, `futureSpacePct`, `tierElevations_mm`). However, some hardcoded logic remains in `AdvancedLayoutSolver.js` (e.g., standard air gap of 75mm, bowing multiplier 0.15) and color generation logic.

## Engineering Report Alignment

### Vertical Architecture
*   **Clearance to Grade & Tier Spacing:** Addressed via the editable `tierElevations_mm` object, defaulting to 4600mm for T1, 7600mm for T2, etc.
*   **Tier Assignment:** Implemented in `AdvancedLayoutSolver.js`. Flare goes to T3, Utilities to T2, rest to T1. User can override via `line.tier`.

### Horizontal Berthing Logic
*   **Weight Constraints & Thermal Hierarchy:** Implemented. Auto-berthing sorts lines by `loopOrder` and places them on the outside edges.
*   **Future Expansion:** Implemented. A `FUTURE_SLOT` object is inserted at the midpoint of each populated tier based on `futureSpacePct`.

### Dynamic Pipe Spacing
*   **$S_{struct}$:** Addressed (`currentX_mm = structSettings.beamWidth_mm / 2 + structSettings.gussetGap_mm`).
*   **$S_{pipe}$:** Addressed, though unit conversions for insulation thickness are incorrect (inches vs mm). Flange staggering logic is implemented.

### Equipment Nozzle & Stress Evaluation (MIST)
*   **Status:** Not fully implemented in the current solver logic. The report mentions a MIST validation function, but it is not actively calculating or triggering `FAIL` events in the `AdvancedLayoutSolver.js` pipeline based on user drags yet.
