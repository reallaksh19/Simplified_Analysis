# LFEA-001 — Element FEA implementation

## Baseline and scope

- Repository baseline: `ce719a719a740d5228b5a404a6848af878954609`
- New application view: `Element FEA`
- New closed shell contracts: `workspace-consumer-registry/v5` and `application-view-state/v5`
- Numerical scope: T3, `UX/UY`, small-displacement isotropic linear elasticity, plane stress and plane strain
- Backend: `dense-ldlt-reference/v1`, explicitly limited by `referenceBackendMaxDofs`

The module is independent of W11, the current workspace dataset, Pipe Solver, viewport state, and all piping-code calculations.

## Authority boundaries

```text
fea-continuum-model/v1
→ fail-closed validation and ancestry qualification
→ deterministic node/DOF allocation
→ T3 stiffness and edge-load operations
→ original-system assembly
→ partitioned prescribed-displacement treatment
→ dense small-model LDLᵀ reference solve
→ reaction, residual, stress and energy recovery
→ fea-continuum-result/v1
```

The UI accepts only explicit JSON. The example is loaded only through the visible **Load Explicit Example** action. It is not a hidden mock or automatic engineering default.

## Numerical conventions

- Displacement order: `UX1, UY1, UX2, UY2, UX3, UY3`
- Strain order: `EX, EY, GXY`
- Stress order: `SX, SY, TXY`
- Shear convention: engineering shear `GXY`
- Element orientation: counterclockwise positive signed area
- Pressure: positive pressure is compressive and acts opposite the outward element-edge normal
- Constraints: partition/elimination; reactions recovered from the original assembled system
- Plane-strain von Mises: includes recovered `sigmaZ`
- T3 stress location: constant element domain; no nodal smoothing

## Fail-closed behavior

The model is rejected before solve for invalid schema or identity, stale ancestry, duplicate identities, missing references, non-finite values, invalid material or thickness, unsupported element/load types, zero or inverted elements, contradictory constraints, disconnected topology, internal-edge loads, duplicate edge loads, or reference-backend capacity excess.

Singular systems emit `REJECTED_SINGULAR`. Ill-conditioned systems emit `QUARANTINED_NUMERICAL`. Residual or equilibrium failures emit no qualified displacement or stress tables.

## Qualification commands

```text
node scripts/lfea-001-check.mjs
npm run lint
npm run syntax:strict
npm run build
npm run check:full
npx playwright test e2e/lfea-001-element-fea.spec.js
```

The LFEA suite covers the single-element hand check, multi-element patch, rigid translations and rotation, plane stress, plane strain, pure shear, biaxial strain, rotated geometry, prescribed displacement, traction, pressure direction, reactions, free/global residuals, strain energy, invalid topology and properties, singularity, stale ancestry, and repeated-run deterministic identity.

## Limitations and unresolved release gates

- Dense reference backend only; no production sparse backend is selected or implied.
- No production-scale model limit is claimed.
- Tolerances are explicit profile evidence and remain model/profile-specific.
- No Q4, higher-order element, shell, axisymmetric, or 3D solid behavior.
- No meshing, smoothing, contact, plasticity, thermal, gravity, dynamics, buckling, W11 coupling, or piping-code qualification.
- Release certification remains outside LFEA-001 authority.
