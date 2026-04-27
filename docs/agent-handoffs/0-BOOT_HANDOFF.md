/* AGENT HANDOFF: 0-BOOT → 1-GC3D, 1-EXT, 1-RACK
 * Date: 2026-04-27
 * Changes:
 *   - src/App.jsx: Wired correct replacement components (CalcExtendedTab, Viewer3DTab).
 *   - src/config/moduleRegistry.js: Removed duplicate and malformed MODULE_REGISTRY causing syntax errors.
 *   - src/index.css: Corrected source path to use calc-extended instead of simp-analysis.
 * Interface changes:
 *   - None.
 * Known open items:
 *   - Agents 1-GC3D, 1-EXT, 1-RACK can now proceed in parallel.
 * Tests run:
 *   - npm run syntax: Passed
 *   - npm run lint: Passed
 *   - npm run test: Passed (smoke-check and moduleRegistry tests passing)
 */
