/**
 * @param {number} D_o - Outside diameter (inches)
 * @param {number} t_n - Nominal wall thickness (inches)
 * @returns {{ D_i, I, Z, r2 }}
 */
export function sectionProperties(D_o, t_n) {
  const D_i = D_o - 2 * t_n;
  const I = (Math.PI / 64) * (Math.pow(D_o, 4) - Math.pow(D_i, 4));
  const Z = I / (D_o / 2);
  const r2 = (D_o - t_n) / 2;  // mean radius of pipe
  return { D_i, I, Z, r2 };
}

/**
 * @param {number} alpha - Coefficient of thermal expansion (in/in/°F)
 * @param {number} L_run_in - Total length of parallel run producing displacement (inches)
 * @param {number} deltaT_F - Temperature change (°F)
 * @returns {number} delta - Thermal displacement (inches)
 */
export function thermalDisplacement(alpha, L_run_in, deltaT_F) {
  return alpha * L_run_in * deltaT_F;
}

/**
 * Basic GC: F, M, Sb for a single leg absorbing displacement delta.
 * @param {number} E - Young's modulus (psi)
 * @param {number} I - Moment of inertia (in⁴)
 * @param {number} Z - Section modulus (in³)
 * @param {number} D_o - Outside diameter (in)
 * @param {number} delta - Displacement absorbed (in)
 * @param {number} L - Length of absorbing leg (in)
 * @returns {{ F_lbf, M_inlbf, Sb_psi }}
 */
export function gcBasic(E, I, Z, D_o, delta, L) {
  if (L <= 0) return { F_lbf: 0, M_inlbf: 0, Sb_psi: 0 };
  const F = 12 * E * I * delta / Math.pow(L, 3);
  const M = F * L / 2;
  const Sb = M / Z;  // Equivalent: 3 * E * D_o * delta / L²
  return { F_lbf: F, M_inlbf: M, Sb_psi: Sb };
}

/**
 * Modified GC: Reduced force when elbow flexibility factor k is applied.
 * The elbow's flexibility increases the effective compliance of the leg.
 *
 * F_corrected = 12·E·I·δ / (L³ + 3·k·R_e·L²)
 * M_corrected = F_corrected · L / 2
 *
 * @param {number} E, I, Z, D_o, delta, L - same as gcBasic
 * @param {number} k - Flexibility factor (≥1.0; use 1.0 for straight pipe or tee)
 * @param {number} R_e - Elbow bend radius (in). For LR elbow: 1.5 × D_o. 0 if no elbow.
 * @returns {{ F_lbf, M_inlbf, Sb_psi, denominator }}
 */
export function gcWithFlexibility(E, I, Z, D_o, delta, L, k, R_e) {
  if (L <= 0) return { F_lbf: 0, M_inlbf: 0, Sb_psi: 0, denominator: 0 };
  const denom = Math.pow(L, 3) + 3 * k * R_e * Math.pow(L, 2);
  const F = 12 * E * I * delta / denom;
  const M = F * L / 2;
  const Sb = M / Z;
  return { F_lbf: F, M_inlbf: M, Sb_psi: Sb, denominator: denom };
}

/**
 * SE = i × M / Z  (for in-plane bending, which governs in GC method)
 *
 * @param {number} i_i - In-plane SIF (≥ 1.0)
 * @param {number} M_inlbf - Bending moment at the fitting
 * @param {number} Z - Section modulus (in³)
 * @returns {number} SE_psi - Expansion stress at the fitting
 */
export function intensifiedStress(i_i, M_inlbf, Z) {
  return i_i * M_inlbf / Z;
}

/**
 * At a node connecting multiple legs, combine bending stresses from each leg.
 * Sb_node = sqrt(Sb_A² + Sb_B²)  for 2 legs
 * Sb_node = sqrt(Sb_A² + Sb_B² + Sb_C²)  for 3 legs (3D corner)
 *
 * @param {number[]} Sb_components - Array of bending stresses from each connected leg
 * @returns {number} Sb_combined
 */
export function combineStressAtNode(Sb_components) {
  return Math.sqrt(Sb_components.reduce((sum, sb) => sum + sb * sb, 0));
}

/**
 * SA = f · (1.25·Sc + 0.25·Sh)  per ASME B31.3 Eq 1a, Clause 302.3.5
 */
export function allowableStress(f, Sc, Sh) {
  return f * (1.25 * Sc + 0.25 * Sh);
}

/**
 * L_min = sqrt(3·E·D_o·δ / SA)  — basic
 * L_min_SIF = sqrt(3·E·D_o·δ·i / SA)  — with SIF
 */
export function requiredLegLength(E, D_o, delta, SA, i = 1.0) {
  const val = 3 * E * D_o * delta * i / SA;
  return val > 0 ? Math.sqrt(val) : 0;
}

/**
 * @returns {{ ratio, result: 'PASS'|'FAIL'|'MARGINAL' }}
 */
export function stressCheck(SE, SA) {
  const ratio = SA > 0 ? SE / SA : Infinity;
  let result = 'PASS';
  if (ratio > 1.0) result = 'FAIL';
  else if (ratio > 0.95) result = 'MARGINAL';
  return { ratio, result };
}
