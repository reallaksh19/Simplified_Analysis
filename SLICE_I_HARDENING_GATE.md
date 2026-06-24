# Slice I — 3D Simplified Hardening Gate and Defect Register

## 1. Gate purpose

This slice does not add new engineering features.

It verifies that the 2D Sketcher → 3D Simplified Calculation workflow built in Slices C–H is stable before adding more capability.

## 2. Scope verified

| Slice | Workflow |
|---|---|
| Slice C | Sketcher pushes model to 3D Simplified Calculation |
| Slice D | Engineering properties transfer into 3D Simplified model contract |
| Slice E | Support-load solver calculates pipe/fluid/insulation/component weight |
| Slice F | Sketcher Master DB row applies component length/weight/provenance |
| Slice G | 3D Simplified report shows method IDs, formula IDs, support loads, assumptions, diagnostics, and Master DB provenance |
| Slice H | Full end-to-end workflow proof |

## 3. Commands required

```bash
npx playwright test e2e/3d-simplified-navigation.spec.js
npx playwright test e2e/3d-simplified-model-contract.spec.js
npx playwright test e2e/3d-simplified-sketcher-push.spec.js
npx playwright test e2e/3d-simplified-property-contract.spec.js
npx playwright test e2e/3d-simplified-support-loads.spec.js
npx playwright test e2e/3d-simplified-master-db-component.spec.js
npx playwright test e2e/3d-simplified-report.spec.js
npx playwright test e2e/3d-simplified-full-workflow.spec.js
npm run build
```

## 4. Result log

| Command                  | Result | Notes |
| ------------------------ | -----: | ----- |
| navigation spec          | PASS   |       |
| model contract spec      | PASS   |       |
| sketcher push spec       | PASS   |       |
| property contract spec   | PASS   |       |
| support loads spec       | PASS   |       |
| Master DB component spec | PASS   |       |
| report spec              | PASS   |       |
| full workflow spec       | PASS   |       |
| npm run build            | PASS   |       |

## 5. Stable test IDs confirmed

| Test ID                                 | Owner               | Status |
| --------------------------------------- | ------------------- | ------ |
| nav-tab-sketcher                        | navigation          | PASS   |
| nav-tab-3d-analysis                     | navigation          | PASS   |
| sketcher-push-to-3d-simplified          | Sketcher            | PASS   |
| sketcher-master-db-component-select     | Sketcher            | PASS   |
| sketcher-master-db-provenance           | Sketcher            | PASS   |
| 3d-simplified-analysis-tab              | 3D Simplified       | PASS   |
| 3d-simplified-model-validation-status   | model contract      | PASS   |
| 3d-simplified-imported-model-summary    | model contract      | PASS   |
| 3d-simplified-property-contract-summary | model contract      | PASS   |
| 3d-simplified-support-load-summary      | support-load solver | PASS   |
| 3d-simplified-support-load-table        | support-load solver | PASS   |
| 3d-simplified-report-summary            | report              | PASS   |
| 3d-simplified-report-markdown           | report              | PASS   |
| 3d-simplified-report-json               | report              | PASS   |

## 6. Engineering limitations intentionally accepted

The current 3D Simplified Calculation workflow is a simplified support-load workflow only.

Accepted limitations:

1. Support reaction distribution is simple end-node equal sharing.
2. No continuous beam/stiffness distribution.
3. No spring support.
4. No nonlinear support gap.
5. No friction redistribution.
6. No seismic, wind, slug, water hammer, or dynamic load.
7. No final code-compliance stress certification.
8. Master DB rows are deterministic fixtures, not a complete project database.
9. Report is local to 3D Simplified Calculation, not yet integrated into global ReportsTab.

## 7. Defect register

| ID     | Severity | Defect / risk | File / area | Action |
| ------ | -------: | ------------- | ----------- | ------ |
| SI-001 |      TBD | None          | N/A         | N/A    |

## 8. Approval rule

Do not start the next feature slice unless:

```text
All Slice C–H Playwright specs pass.
npm run build passes.
Any failing result is recorded in this file.
Any defect affecting workflow correctness is fixed or explicitly deferred.
```

## 9. Next approved feature candidate

Only after this hardening gate passes:

```text
Slice J — component placement UX and property editing hardening
```

or

```text
Slice J — export/download report from 3D Simplified Calculation
```

Decision depends on the defect register.
