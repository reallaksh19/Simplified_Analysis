/**
 * Elbow flexibility characteristic h, SIF, and k per B31.3 legacy Appendix D.
 *
 * h = T · R1 / r2²
 * k = 1.65 / h
 * i_i = max(0.9 / h^(2/3), 1.0)
 * i_o = max(0.75 / h^(2/3), 1.0)
 *
 * @param {number} T - Wall thickness (in) — of the elbow (typically same as matching pipe)
 * @param {number} R1 - Bend radius (in) — LR: 1.5×D_o, SR: 1.0×D_o
 * @param {number} r2 - Mean radius of matching pipe = (D_o - T) / 2 (in)
 * @returns {{ h, k, i_i, i_o }}
 */
export function elbowSIF(T, R1, r2) {
  const h = T * R1 / (r2 * r2);
  const k = 1.65 / h;
  const h_23 = Math.pow(h, 2 / 3);
  const i_i = Math.max(0.9 / h_23, 1.0);
  const i_o = Math.max(0.75 / h_23, 1.0);
  return { h, k, i_i, i_o };
}

/**
 * h_tee = 4.4 · t / r2
 * i = max(0.9 / h_tee^(2/3), 1.0)
 * k = 1.0 (standard for tees — no flexibility enhancement)
 *
 * @param {number} t - Wall thickness of matching pipe (in)
 * @param {number} r2 - Mean radius of RUN (header) pipe = (D_o - t) / 2 (in)
 * @returns {{ h, k, i_i, i_o }}
 */
export function unreinforcedTeeSIF(t, r2) {
  const h = 4.4 * t / r2;
  const h_23 = Math.pow(h, 2 / 3);
  const i_i = Math.max(0.9 / h_23, 1.0);
  const i_o = i_i;  // Same for unreinforced fabricated tee per Appendix D
  const k = 1.0;
  return { h, k, i_i, i_o };
}

/**
 * Given a component type and pipe geometry, return SIF data.
 * When includeSIF=false, returns { h:0, k:1.0, i_i:1.0, i_o:1.0 }
 *
 * @param {string} compType - 'ELBOW' | 'BEND' | 'TEE' | 'PIPE' | ...
 * @param {number} D_o - OD (in)
 * @param {number} t_n - Wall thickness (in)
 * @param {boolean} includeSIF - whether to compute or return unity
 * @param {'LR'|'SR'} bendType - Long radius or short radius (default LR)
 * @returns {{ h, k, i_i, i_o, R_e }}
 */
export function getSIFData(compType, D_o, t_n, includeSIF = true, bendType = 'LR') {
  if (!includeSIF) {
    return { h: 0, k: 1.0, i_i: 1.0, i_o: 1.0, R_e: 0 };
  }

  const r2 = (D_o - t_n) / 2;

  switch (compType) {
    case 'ELBOW':
    case 'BEND': {
      const R1 = bendType === 'LR' ? 1.5 * D_o : 1.0 * D_o;
      const result = elbowSIF(t_n, R1, r2);
      return { ...result, R_e: R1 };
    }
    case 'TEE': {
      const result = unreinforcedTeeSIF(t_n, r2);
      return { ...result, R_e: 0 };
    }
    default:
      // PIPE, VALVE, FLANGE, etc. — no SIF amplification
      return { h: 0, k: 1.0, i_i: 1.0, i_o: 1.0, R_e: 0 };
  }
}
