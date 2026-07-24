export function vector3(value, label) {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new TypeError(`${label} must contain exactly three components.`);
  }
  return Object.freeze(value.map((component) => finite(component, `${label} component`)));
}

export function finite(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number.`);
  }
  return canonicalNumber(value);
}

export function canonicalNumber(value) {
  if (!Number.isFinite(value)) throw new TypeError('Calculated value must be finite.');
  return Object.is(value, -0) ? 0 : value;
}

export function add(left, right) {
  return vectorResult([
    left[0] + right[0],
    left[1] + right[1],
    left[2] + right[2],
  ]);
}

export function subtract(left, right) {
  return vectorResult([
    left[0] - right[0],
    left[1] - right[1],
    left[2] - right[2],
  ]);
}

export function scale(vector, factor) {
  return vectorResult([
    vector[0] * factor,
    vector[1] * factor,
    vector[2] * factor,
  ]);
}

export function dot(left, right) {
  return canonicalNumber(left[0] * right[0] + left[1] * right[1] + left[2] * right[2]);
}

export function cross(left, right) {
  return vectorResult([
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ]);
}

export function norm(vector) {
  return canonicalNumber(Math.hypot(vector[0], vector[1], vector[2]));
}

export function normalize(vector, label) {
  const componentScale = Math.max(...vector.map((component) => Math.abs(component)));
  if (!Number.isFinite(componentScale) || componentScale === 0) {
    throw new TypeError(`${label} is zero or numerically degenerate.`);
  }
  const scaled = vectorResult(vector.map((component) => component / componentScale));
  return scale(scaled, 1 / norm(scaled));
}

export function transformRows(rows, vector) {
  return vectorResult(rows.map((row) => dot(row, vector)));
}

export function transformColumns(rows, vector) {
  return add(add(scale(rows[0], vector[0]), scale(rows[1], vector[1])), scale(rows[2], vector[2]));
}

function vectorResult(value) {
  return value.map(canonicalNumber);
}
