1. Files changed
   - None

2. New files added
   - docs/SPL2_FORMULA_EXTRACTION.md
   - docs/SPL2_REFERENCE_MAP.md
   - benchmarks/spl2-reference/case-simp.json
   - benchmarks/spl2-reference/case-loop.json
   - benchmarks/spl2-reference/case-rack.json
   - benchmarks/expected/spl2/case-simp-expected.json
   - benchmarks/expected/spl2/case-loop-expected.json
   - benchmarks/expected/spl2/case-rack-expected.json
   - src/reference/spl2/README.md
   - docs/agent-handoffs/AGENT_04_SPL2_REFERENCE_HANDOFF.md

3. Deleted files
   - None

4. Engineering assumptions introduced
   - Legacy SPL2 calculations are proxies, approximations, and rules-of-thumb rather than precise compliance calculations. They have been officially retired as the core engine.
   - Values like `62.4 lb/ft3` for water density, `1.5D` bend radius factors, and `12 lb/ft3` for typical insulation density are hardcoded in SPL2 and will need to be parameterized or matched in the new active modules.
   - The SPL2 polynomial curve fit for MW Kellogg is a severe approximation, meaning its results cannot be verified directly as "correct" against a true FEA analysis; they must remain reference-only benchmarks to assure backwards compatibility/expectation parity.

5. Tests added
   - Placeholder JSON benchmarks created in `benchmarks/spl2-reference/` and `benchmarks/expected/spl2/` with the status `PENDING_NUMERIC_EXTRACTION`.

6. Commands run
   - npm run syntax
   - npm run test
   - npm run check:full
   - Extracted and read legacy logic via `cat` and `grep`.

7. Commands not run and why
   - No solvers were run or modified directly because this task is exclusively for extraction and documentation.

8. Known risks
   - There are no absolute "verified" numeric ground truths extracted directly from the SPL2 JS code alone without running it in a headed browser to capture exact DOM output given identical inputs. The JSON benchmark files currently mark all expected values as `PENDING_NUMERIC_EXTRACTION`. Future numeric extraction via Playwright or manual transcription is needed before `ENGINEERING BENCHMARK VERIFIED` can be declared.

9. Next-agent dependencies
   - Agent 5 (2D Solver Cert) and Agent 7 (PipeRack & Loop Agent) will need to ensure their modules can consume inputs similar to those defined in the `spl2-reference` benchmark cases to eventually validate parity.
