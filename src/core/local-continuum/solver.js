import { FORMULA_IDS } from './constants.js';
import { numericalError, singularError } from './errors.js';
import { matrixVector, zeros } from './matrix.js';
import { canonicalNumber, maxAbs, tolerance } from './numeric.js';

export function solvePartitioned(model, mesh, load) {
  const constraints = constraintData(model, mesh.dofOrdering);
  const free = mesh.dofOrdering.map((_, index) => index).filter((index) => !constraints.indexSet.has(index));
  const constrained = constraints.indices;
  const stiffness = mesh.globalStiffnessMatrix;
  const force = load.forceVector;
  const displacement = Array(stiffness.length).fill(0);
  constrained.forEach((index, position) => { displacement[index] = constraints.values[position]; });

  let solverEvidence = emptySolverEvidence();
  if (free.length) {
    const freeStiffness = submatrix(stiffness, free, free);
    const coupling = submatrix(stiffness, free, constrained);
    const rightHandSide = free.map((index, row) => canonicalNumber(
      force[index] - dotRow(coupling[row], constraints.values),
      'partition rhs',
    ));
    const solved = choleskySolve(freeStiffness, rightHandSide, model.qualificationProfile);
    free.forEach((index, position) => { displacement[index] = solved.solution[position]; });
    solverEvidence = solved.evidence;
  }

  const stiffnessDisplacement = matrixVector(stiffness, displacement);
  const residual = stiffnessDisplacement.map((value, index) => canonicalNumber(
    value - force[index],
    'equilibrium residual',
  ));
  const qualification = qualifyResiduals(
    model,
    mesh.dofOrdering,
    free,
    constrained,
    force,
    residual,
  );
  const formulaIds = [FORMULA_IDS.PARTITION, FORMULA_IDS.REACTION, FORMULA_IDS.EQUILIBRIUM];
  if (free.length) formulaIds.push(FORMULA_IDS.CHOLESKY);

  return {
    displacementVector: displacement.map((value) => canonicalNumber(value, 'displacement')),
    reactionVector: residual,
    freeDofIdentities: free.map((index) => mesh.dofOrdering[index]),
    constrainedDofIdentities: constrained.map((index) => mesh.dofOrdering[index]),
    freeDofResiduals: free.map((index) => ({
      dofIdentity: mesh.dofOrdering[index],
      value: residual[index],
    })),
    reactions: constrained.map((index) => ({
      dofIdentity: mesh.dofOrdering[index],
      value: residual[index],
      prescribedDisplacement: displacement[index],
    })),
    solverEvidence,
    equilibrium: qualification,
    formulaIds: formulaIds.sort(),
  };
}

function constraintData(model, dofs) {
  const index = new Map(dofs.map((identity, position) => [identity, position]));
  const rows = model.constraints.map((row) => ({
    index: index.get(`${row.nodeId}:${row.dof}`),
    value: row.value,
  })).sort((left, right) => left.index - right.index);
  return {
    indices: rows.map((row) => row.index),
    values: rows.map((row) => row.value),
    indexSet: new Set(rows.map((row) => row.index)),
  };
}

function submatrix(matrix, rows, columns) {
  return rows.map((row) => columns.map((column) => matrix[row][column]));
}

function dotRow(row, vector) {
  return row.reduce((sum, value, index) => sum + value * vector[index], 0);
}

function choleskySolve(matrix, rightHandSide, profile) {
  const size = matrix.length;
  const lower = zeros(size, size);
  const scale = Math.max(1, ...matrix.map((row, index) => Math.abs(row[index])));
  const limit = tolerance(profile, 'choleskyPivot', scale);
  const pivots = [];
  factorCholesky(matrix, lower, pivots, limit);
  const intermediate = forward(lower, rightHandSide);
  const solution = backward(lower, intermediate);
  const minimum = Math.min(...pivots);
  const maximum = Math.max(...pivots);
  return {
    solution: solution.map((value) => canonicalNumber(value, 'solved displacement')),
    evidence: {
      method: 'DETERMINISTIC_CHOLESKY',
      pivotScale: scale,
      pivotTolerance: limit,
      pivots: pivots.map((value) => canonicalNumber(value, 'pivot')),
      minimumPivot: canonicalNumber(minimum),
      maximumPivot: canonicalNumber(maximum),
      pivotRatio: canonicalNumber(minimum / maximum),
      accepted: true,
    },
  };
}

function factorCholesky(matrix, lower, pivots, limit) {
  for (let row = 0; row < matrix.length; row += 1) {
    for (let column = 0; column <= row; column += 1) {
      let value = matrix[row][column];
      for (let index = 0; index < column; index += 1) {
        value -= lower[row][index] * lower[column][index];
      }
      if (row === column) setPivot(lower, pivots, row, value, limit);
      else lower[row][column] = value / lower[column][column];
    }
  }
}

function setPivot(lower, pivots, index, value, limit) {
  if (value < -limit) {
    throw singularError('INDEFINITE_FREE_STIFFNESS', 'solver', `Negative Cholesky pivot ${value}.`);
  }
  if (value <= limit) {
    throw singularError(
      'UNDER_CONSTRAINED_OR_SINGULAR_SYSTEM',
      'solver',
      `Cholesky pivot ${value} does not exceed ${limit}.`,
    );
  }
  lower[index][index] = Math.sqrt(value);
  pivots.push(value);
}

function forward(lower, rightHandSide) {
  const output = Array(rightHandSide.length).fill(0);
  for (let row = 0; row < rightHandSide.length; row += 1) {
    let value = rightHandSide[row];
    for (let column = 0; column < row; column += 1) value -= lower[row][column] * output[column];
    output[row] = value / lower[row][row];
  }
  return output;
}

function backward(lower, rightHandSide) {
  const output = Array(rightHandSide.length).fill(0);
  for (let row = rightHandSide.length - 1; row >= 0; row -= 1) {
    let value = rightHandSide[row];
    for (let column = row + 1; column < rightHandSide.length; column += 1) {
      value -= lower[column][row] * output[column];
    }
    output[row] = value / lower[row][row];
  }
  return output;
}

function qualifyResiduals(model, dofs, free, constrained, force, residual) {
  const scale = Math.max(1, maxAbs(force), maxAbs(residual));
  const freeLimit = tolerance(model.qualificationProfile, 'freeDofResidual', scale);
  const freeMaximum = Math.max(0, ...free.map((index) => Math.abs(residual[index])));
  if (freeMaximum > freeLimit) {
    throw numericalError('FREE_DOF_RESIDUAL_FAILURE', 'solver', 'Free-DOF residual did not qualify.');
  }
  const totals = equilibriumTotals(dofs, constrained, force, residual);
  const equilibriumLimit = tolerance(model.qualificationProfile, 'reactionEquilibrium', scale);
  const maximum = Math.max(Math.abs(totals.UX), Math.abs(totals.UY));
  if (maximum > equilibriumLimit) {
    throw numericalError('REACTION_EQUILIBRIUM_FAILURE', 'solver', 'Reaction equilibrium did not qualify.');
  }
  return {
    residualScale: scale,
    freeDofMaximumResidual: canonicalNumber(freeMaximum),
    freeDofTolerance: freeLimit,
    reactionPlusAppliedForce: { x: canonicalNumber(totals.UX), y: canonicalNumber(totals.UY) },
    reactionEquilibriumTolerance: equilibriumLimit,
    accepted: true,
  };
}

function equilibriumTotals(dofs, constrained, force, residual) {
  const totals = { UX: 0, UY: 0 };
  force.forEach((value, index) => { totals[dofAxis(dofs[index])] += value; });
  constrained.forEach((index) => { totals[dofAxis(dofs[index])] += residual[index]; });
  return totals;
}

function dofAxis(identity) { return identity.endsWith(':UX') ? 'UX' : 'UY'; }

function emptySolverEvidence() {
  return {
    method: 'FULLY_CONSTRAINED_NO_FREE_SOLVE',
    pivotScale: null,
    pivotTolerance: null,
    pivots: [],
    minimumPivot: null,
    maximumPivot: null,
    pivotRatio: null,
    accepted: true,
  };
}
