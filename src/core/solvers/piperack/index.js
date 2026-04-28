/* AGENT HANDOFF: Agent 1-RACK → Agent 2-DB / Agent 3-UI / Agent 4-QA
 * Date: 2026-04-27
 * Changes:
 *   - solveRackLoopOrder.js: Documented 144 factor and 2D_BUNDLE methodology length multiplier basis.
 *   - solveRackLayout.js: Named magic numbers for pipe guide clearances, documented bowingMultiplier.
 *   - solvePipeRack.js: Enhanced return shape to include `formulaTrace` and rich `assumptions` array.
 * Interface changes:
 *   - solvePipeRack: Return shape now includes `formulaTrace[]` and updated `assumptions[]` — Agent 3-UI to consume.
 * Known open items:
 *   - None for Piperack logic.
 * Tests run:
 *   - piperack solver tests (npx jest src/piperack/solver/PipeRackSolver.test.js): PASS
 *   - bm3_benchmarks tests (npx jest run_bm3_benchmarks.test.js): PASS
 */

export { solvePipeRack } from './solvePipeRack.js';
export { solveRackLoopOrder } from './solveRackLoopOrder.js';
export { solveRackLayout } from './solveRackLayout.js';
export { summarizeLineSpacing } from './solveLineSpacing.js';
