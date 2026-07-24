export function vector3(value, label) {
  if (!Array.isArray(value) || value.length !== 3) throw new TypeError(`${label} must contain exactly three components.`);
  const result = value.map((component) => finite(component, `${label} component`));
  return Object.freeze(result);
}

export function finite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${label} must be finite.`);
  return Object.is(number, -0) ? 0 : number;
}

export function add(left, right) {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

export function subtract(left, right) {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

export function scale(vector, factor) {
  return [vector[0] * factor, vector[1] * factor, vector[2] * factor];
}

export function dot(left, right) {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

export function cross(left, right) {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

export function norm(vector) {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

export function normalize(vector, label, minimumNorm = 1e-12) {
  const magnitude = norm(vector);
  if (!Number.isFinite(magnitude) || magnitude <= minimumNorm) throw new TypeError(`${label} is zero or numerically degenerate.`);
  return scale(vector, 1 / magnitude);
}

export function transformRows(rows, vector) {
  return rows.map((row) => dot(row, vector));
}
