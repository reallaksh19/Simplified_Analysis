# Local stress foundation

## Scope

The **Local stress** tab is an independent calculator. It does not read from or mutate the current Workspace dataset, analysis session, ledger, solver, viewport, or report state.

It provides:

- a right-handed pipe-local basis where `X` is axial, `Y` is circumferential tangent, and `Z` is radial outward;
- global-to-local force and moment transformation;
- force-resultant transfer between declared source and target points;
- elastic Lamé radial and hoop pressure stresses;
- explicit open-end or closed-end axial pressure stress;
- deterministic immutable result evidence.

## Canonical units

```text
length:   mm
force:    N
moment:   N·mm
pressure: MPa
stress:   MPa
```

## Engineering limitation

The module is qualified only as:

```text
LOAD_TRANSFER_AND_PRESSURE_BASELINE_ONLY
```

It does not calculate local attachment, shell, weld, contact, external-pressure stability, fatigue, fracture, plastic, or code-compliance stress.

## Equations

Reference-point transfer:

```text
F_T = F_S
M_T = M_S + (r_S - r_T) × F
```

Lamé pressure recovery:

```text
sigma_r(r)     = A - B / r^2
sigma_theta(r) = A + B / r^2
A = (pi*ri^2 - po*ro^2) / (ro^2 - ri^2)
B = ((pi-po)*ri^2*ro^2) / (ro^2 - ri^2)
```

Closed-end pressure axial stress is `A`; open-end pressure axial stress is zero.
