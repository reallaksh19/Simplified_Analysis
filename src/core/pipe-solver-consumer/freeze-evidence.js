export function freezeEvidenceGraph(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach((child) => freezeEvidenceGraph(child, seen));
  return Object.isFrozen(value) ? value : Object.freeze(value);
}
