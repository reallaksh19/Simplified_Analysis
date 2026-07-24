# Local stress core prototype

## Owner-control status

This branch retains only a **core-only, non-canonical prototype**. It is not an
authorized LAFEA.1 foundation contract and is not merge-authorized.

W10.12 / Issue #134 owns `workspace-consumer-registry/v5` and
`application-view-state/v5`. This prototype therefore has:

- no application tab;
- no Workspace registry or view-state integration;
- no controller, automatic execution, runtime writer, canvas, or public API;
- no changes to historical browser tests or W10.11 source guards.

The accepted pre-W10.12 baseline remains
`ce719a719a740d5228b5a404a6848af878954609`. Rebase and contract completion
must wait for the accepted post-W10.12 baseline and an explicit LAFEA.1 Issue.

## Prototype mechanics retained

The module currently demonstrates:

- a right-handed pipe-local basis where `X` is axial, `Y` is circumferential
  tangent, and `Z` is radial outward;
- global-to-local force and moment transformation;
- resultant transfer between declared source and target points;
- component reconstruction and common-origin moment residual evidence;
- elastic Lamé radial and hoop pressure stresses;
- explicit open-end or closed-end axial pressure rules;
- deterministic immutable prototype output.

## Units used by this prototype

```text
length:   mm
force:    N
moment:   N·mm
pressure: MPa
stress:   MPa
```

These units are embedded prototype assumptions, not the required future
explicit unit-input contract.

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

Closed-end pressure axial stress is `A`; open-end pressure axial stress is
zero.

## Deliberately unresolved

The prototype does not provide the future canonical model identity, source
ancestry, coordinate/load identities, explicit unit input, result requests,
qualification profile, pad/cradle thickness isolation, explicit axial
resultant governance, `UNSPECIFIED` end condition, requested-radius recovery,
controlled rejected-result contracts, or separate source/model/result/evidence
hash scopes.

It does not calculate local attachment, shell, weld, contact,
external-pressure stability, fatigue, fracture, plastic, or code-compliance
stress.

## Unregistered smoke check

```bash
node scripts/local-stress-contract-check.mjs
```

This is a narrow prototype smoke check only. Dedicated registered contract,
property, benchmark, and source-guard suites require the future authorized
LAFEA.1 Work Pack.
