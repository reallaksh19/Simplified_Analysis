import { deepFreeze } from '../shared-piping-model/index.js';
import { BACKEND_ID } from './constants.js';
import { zeros } from './matrix.js';

export function solveDenseLdlt(matrix, rightHandSide, tolerances) {
  const factor = factorLdlt(matrix, tolerances.pivotAbsolute);
  if (!factor.ok) return deepFreeze({ ...factor, backendIdentity: BACKEND_ID });
  const pivotRatio = factor.minimumPivot / factor.maximumPivot;
  if (pivotRatio < tolerances.pivotRatio) {
    return deepFreeze({ ok: false, classification: 'ILL_CONDITIONED', pivotRatio, pivots: factor.pivots, backendIdentity: BACKEND_ID });
  }
  const solution = solveFactors(factor.L, factor.pivots, rightHandSide);
  return deepFreeze({ ok: true, solution, pivotRatio, pivots: factor.pivots, backendIdentity: BACKEND_ID });
}

function factorLdlt(matrix, pivotAbsolute) {
  const size = matrix.length;
  const L = zeros(size);
  const pivots = Array(size).fill(0);
  for (let row = 0; row < size; row += 1) {
    L[row][row] = 1;
    for (let column = 0; column < row; column += 1) L[row][column] = lowerValue(matrix, L, pivots, row, column);
    pivots[row] = diagonalValue(matrix, L, pivots, row);
    if (!Number.isFinite(pivots[row]) || pivots[row] <= pivotAbsolute) {
      return { ok: false, classification: 'SINGULAR', pivotIndex: row, pivots: pivots.slice(0, row + 1) };
    }
  }
  const magnitudes = pivots.map(Math.abs);
  return { ok: true, L, pivots, minimumPivot: Math.min(...magnitudes), maximumPivot: Math.max(...magnitudes) };
}

function lowerValue(matrix, L, pivots, row, column) {
  let value = matrix[row][column];
  for (let index = 0; index < column; index += 1) value -= L[row][index] * L[column][index] * pivots[index];
  return value / pivots[column];
}

function diagonalValue(matrix, L, pivots, row) {
  let value = matrix[row][row];
  for (let index = 0; index < row; index += 1) value -= L[row][index] ** 2 * pivots[index];
  return value;
}

function solveFactors(L, pivots, rightHandSide) {
  const forward = forwardSubstitution(L, rightHandSide);
  const diagonal = forward.map((value, index) => value / pivots[index]);
  return backwardSubstitution(L, diagonal);
}

function forwardSubstitution(L, rightHandSide) {
  const result = Array(rightHandSide.length).fill(0);
  for (let row = 0; row < result.length; row += 1) {
    let value = rightHandSide[row];
    for (let column = 0; column < row; column += 1) value -= L[row][column] * result[column];
    result[row] = value;
  }
  return result;
}

function backwardSubstitution(L, rightHandSide) {
  const result = Array(rightHandSide.length).fill(0);
  for (let row = result.length - 1; row >= 0; row -= 1) {
    let value = rightHandSide[row];
    for (let column = row + 1; column < result.length; column += 1) value -= L[column][row] * result[column];
    result[row] = value;
  }
  return result;
}
