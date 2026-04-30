# Legacy SPL2 Reference Data

This directory contains metadata and reference mapping for the legacy SPL2 calculation bundle.

The `spl2-bundle` codebase (located in `public/spl2-bundle` and `src/spl2-bundle`) is officially retired as an active calculation engine. Its logic files have been analyzed and its core formulas have been mapped to new Phase 6 active modules.

## Status
**REFERENCE ONLY**.

The legacy logic serves as a baseline for engineering benchmarks.

- Simplified Method proxy calculations (`spl2_simp_logic.js`) map to `2d-simplified-stress-check`.
- Expansion Loop layout approximations (`spl2_loop_logic.js`) map to `piperack-expansion-loop`.
- Pipe Rack loads (`spl2_rack_logic.js`) map to `piperack-expansion-loop`.

Do not import or use SPL2 logic directly in any active module without explicitly documenting the proxy math assumptions and limitations.
