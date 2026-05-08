# Phase V13: Report Export and Checker Workflow

## Objective
Upgrade reporting from preview-only to controlled engineering issue workflow with revision tracking, reviewer fields, and export capabilities.

## Key Features
- **Report Revision ID**: Stable hash-based tracking with `rpt-` prefix
- **Issue Status**: DRAFT → CHECKED → ISSUED or VOID
- **Issue Type**: SCREENING_ISSUE vs FINAL_ISSUE
- **Reviewer Fields**: preparedBy, checkedBy, approvedBy, checkerNotes
- **Export Formats**: Markdown, JSON snapshot, HTML print
- **Report History**: Track up to 50 revisions per session
- **Safety Rules**: Block issuance when results stale, data missing, or certification fails

## Blocking Rules
Cannot issue when:
- Results are stale
- Data status is MISSING_DATA, NOT_QUALIFIED, or UNSUPPORTED_GEOMETRY
- Solver status is NOT_QUALIFIED, MISSING_DATA, UNSUPPORTED_GEOMETRY, BENCHMARK_NOT_CERTIFIED, or FAILED
- Engineering level is SCREENING and attempting FINAL_ISSUE
- Benchmark certification required but not PASSED
- Required reviewer fields (preparedBy, checkedBy, approvedBy) not set

## Files Created
- `src/reporting/reportIssueWorkflow.js` — Status, type, eligibility, revision creation
- `src/reporting/reportExportUtils.js` — Filename sanitization, HTML render, export bundle
- `scripts/v13-report-export-checker-check.mjs` — Static verification
- `scripts/v13-report-export-checker-behavior-test.mjs` — Behavioral tests
- `e2e/v13-report-export-checker.spec.js` — End-to-end tests

## Files Updated
- `src/store/appStore.js` — Added reportReviewState, reportHistory, actions
- `src/reporting/ReportsTab.jsx` — Added checker workflow UI panel
- `package.json` — Added check:v13, check:v13:behavior, ci:v13

## Certification
```bash
npm run check:v13
npm run check:v13:behavior
npm run check:benchmarks
npm run build
```
