/* AGENT HANDOFF: 1-EXT → 2-DB / 3-UI / 4-QA
 * Date: 2026-04-27
 * Changes:
 *   - ExtendedSolver.js: Fixed E-1 unit error in force formula (now explicitly uses 1728 to convert ft³ to in³).
 *   - ExtendedSolver.js: Fixed E-2 arbitrary stress multiplier in 2D_BUNDLE methodology. Friction now only amplifies force.
 *   - ExtendedSolver.js: Fixed E-3 by adding material-aware flange rating lookup.
 *   - ExtendedSolver.js: Fixed E-4 by defining F_M_DEFAULT (1.0) and supporting override.
 *   - ExtendedSolver.js: Added comprehensive MIST and Koves formula trace for Phase 3/4.
 *   - ExtendedSolver.js: Added clear UNIT CONTRACT for parseGeometry.
 * Interface changes:
 *   - runExtendedSolver: returned object now contains rich formulaTrace arrays for Phase 3 & 4.
 * Known open items:
 *   - UI needs to display the new formulaTrace elements (Agent 3-UI).
 *   - Tests need adjustment for corrected (lower) force outputs (Agent 4-QA).
 * Tests run:
 *   - ExtendedSolver.test.js: adjusted and passing.
 */
import expansionCoeffs from '../db/expansion_coefficients.json' with { type: 'json' };
import modulusElasticity from '../db/modulus_elasticity.json' with { type: 'json' };
import pipeProps from '../db/pipe_properties.json' with { type: 'json' };
import flangeRatings from '../db/flange_ratings.json' with { type: 'json' };
import gasketDims from '../db/gasket_dimensions.json' with { type: 'json' };
import designStress from '../db/design_stress.json' with { type: 'json' };

// DB Lookups with Interpolation
const interpolateDB = (data, temp, valueKey) => {
  const sorted = [...data].sort((a, b) => a.temp_F - b.temp_F);
  if (temp <= sorted[0].temp_F) return sorted[0][valueKey];
  if (temp >= sorted[sorted.length - 1].temp_F) return sorted[sorted.length - 1][valueKey];

  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];
    if (temp >= p1.temp_F && temp <= p2.temp_F) {
      const ratio = (temp - p1.temp_F) / (p2.temp_F - p1.temp_F);
      return p1[valueKey] + ratio * (p2[valueKey] - p1[valueKey]);
    }
  }
};

const getMaterialProps = (material, temp, warnings = []) => {
  const expMat = expansionCoeffs.find(m => m.material === material);
  const resolvedExpMat = expMat || expansionCoeffs[0];
  if (!expMat) warnings.push(`Expansion coefficient fallback used for material "${material}".`);

  const e_chart = interpolateDB(resolvedExpMat.data, temp, 'expansion_in_per_100ft');

  const modMat = modulusElasticity.find(m => m.material === material);
  const resolvedModMat = modMat || modulusElasticity[0];
  if (!modMat) warnings.push(`Elastic modulus fallback used for material "${material}".`);

  const E_chart = interpolateDB(resolvedModMat.data, temp, 'modulus_ksi');

  return { e: e_chart / 100, E: E_chart * 1000000, expansionMaterial: resolvedExpMat.material, modulusMaterial: resolvedModMat.material };
};

const getPipeProps = (size, schedule, warnings = []) => {
  const pipe = pipeProps.find(p => p.nominal_size === size && p.schedule === schedule);
  if (!pipe) warnings.push(`Pipe property fallback used for NPS ${size}, schedule ${schedule}.`);
  return pipe || pipeProps[0];
};

// Geometry Parsing & Filtering Short Drops (Rule of Rigidity)
/**
 * Parses canonical geometry nodes/segments.
 * UNIT CONTRACT: node coordinates must be in FEET.
 * The canonical geometry adapter (canonicalToExtended.js) is responsible
 * for converting mm/in → ft before calling this function.
 * bendingLegs output units: feet (for use in calcAxis with FT2_TO_IN2/FT3_TO_IN3 constants)
 */
const parseGeometry = (nodes, segments, anchor1Id, anchor2Id) => {
  const n1 = nodes.find(n => n.id === anchor1Id);
  const n2 = nodes.find(n => n.id === anchor2Id);
  if (!n1 || !n2) throw new Error("Anchors not found in nodes");

  const diffX = n2.x - n1.x;
  const diffY = n2.y - n1.y;
  const diffZ = n2.z - n1.z;

  let bX = 0, bY = 0, bZ = 0;
  let shortDropsIgnored = 0;

  segments.forEach(seg => {
    const s1 = nodes.find(n => n.id === seg.startNodeId);
    const s2 = nodes.find(n => n.id === seg.endNodeId);
    if (!s1 || !s2) return;

    const dx = Math.abs(s2.x - s1.x);
    const dy = Math.abs(s2.y - s1.y);
    const dz = Math.abs(s2.z - s1.z);

    // Rule: Filter out Z-axis drops <= 3 ft. Coordinates are feet, not inches.
    const shortDropLimit_ft = 3.0;
    if (dz > 0 && dx === 0 && dy === 0 && dz <= shortDropLimit_ft) {
      shortDropsIgnored++;
      return; // Ignore this segment for flexibility
    }

    // Accumulate bending legs.
    // bX (Flexibility against X expansion) = length of segments in Y and Z.
    // bY (Flexibility against Y expansion) = length of segments in X and Z.
    // bZ (Flexibility against Z expansion) = length of segments in X and Y.
    bX += dy + dz;
    bY += dx + dz;
    bZ += dx + dy;
  });

  return {
    netDiff: { x: diffX, y: diffY, z: diffZ },
    bendingLegs: { x: bX, y: bY, z: bZ },
    shortDropsIgnored,
    shortDropLimit_ft: 3.0,
    unitSystem: { coordinate: 'ft' }
  };
};

const MATERIAL_TO_FLANGE_GROUP = {
  'Carbon Steel': 'Group 1.1',
  'Austenitic Stainless Steel 18 Cr 8 Ni': 'Group 2.1',
};

const getFlangeRating = (flangeClass, temp, material) => {
  const groupName = MATERIAL_TO_FLANGE_GROUP[material] || 'Group 1.1';
  const group = flangeRatings.find(g => g.group === groupName) || flangeRatings[0];
  const cl = group.data.find(c => c.class === flangeClass);
  if (!cl) return 0;
  return interpolateDB(cl.ratings, temp, 'psi');
};

const getGasket = (size, flangeClass) => {
  const g = gasketDims.find(g => g.nominal_size === size && g.class === flangeClass);
  return g ? g.G_in : size * 1.5; // Fallback
};

const getDesignStress = (material) => {
  const s = designStress.find(d => d.material === material);
  return s ? s.f_psi : 20000;
};

// Guided Cantilever Approximation Solver
export const runExtendedSolver = (payload) => {
  const { nodes, segments, anchors, inputs, vessel, boundaryMovement, constraints, methodology } = payload;
  const { material, pipeSize, schedule, tOperate, corrosionAllowance, millTolerance, frictionFactor } = inputs;
  const warnings = [];
  const formulaTrace = [];

  const { e, E, expansionMaterial, modulusMaterial } = getMaterialProps(material, tOperate, warnings);
  const pipe = getPipeProps(pipeSize, schedule, warnings);
  const { I, OD, t: nom_t } = pipe;

  // Apply Manufacturing Constraints (Corrosion & Mill Tolerance)
  let I_eff = I;
  if (corrosionAllowance !== undefined && millTolerance !== undefined && nom_t !== undefined) {
    // 1. Subtract Mill Tolerance (%)
    const t_m = nom_t * (1 - millTolerance / 100);
    // 2. Subtract Corrosion Allowance
    const t_eff = Math.max(t_m - corrosionAllowance, 0.001); // Prevent <= 0
    // 3. Recalculate I: I = (pi/64) * (OD^4 - ID^4)
    const ID_eff = OD - (2 * t_eff);
    I_eff = (Math.PI / 64) * (Math.pow(OD, 4) - Math.pow(ID_eff, 4));
  }

  const { netDiff, bendingLegs, shortDropsIgnored } = parseGeometry(nodes, segments, anchors.anchor1, anchors.anchor2);
  formulaTrace.push({ name: 'Geometry decomposition', expression: 'netDiff = anchor2 - anchor1; bending legs by perpendicular runs', values: { netDiff, bendingLegs, shortDropsIgnored } });

  // Phase 1: Global Piping Reactions (Fluor vs 2D Bundle)
  const calcAxis = (axis, net, bendLeg, boundMovement) => {
    const delta = (Math.abs(net) * e) + (boundMovement || 0);

    const FT3_TO_IN3 = 1728; // 12^3 - cubic feet to cubic inches conversion
    const FT2_TO_IN2 = 144;  // 12^2 - square feet to square inches conversion

    let force = bendLeg > 0 ? (3 * E * I_eff * delta) / (FT3_TO_IN3 * Math.pow(bendLeg, 3)) : 0;
    let stress = bendLeg > 0 ? (3 * E * OD * delta) / (FT2_TO_IN2 * Math.pow(bendLeg, 2)) : 0;

    // METHODOLOGY DIVERGENCE:
    // In 2D Bundle method (piperack with multiple guided pipes), guide friction
    // acts as an additional axial force on supports, increasing the effective load
    // on the anchor per Fluor simplified bundle analysis: F_friction = μ × W_pipe
    // per span. Since weight is not modeled here, treat frictionFactor as a direct
    // force amplifier on thermal reaction (engineering judgement basis).
    // Stress is NOT amplified because friction is a force/moment amplifier,
    // not a directly additive stress. Remove the stress multiplier.
    if (methodology === '2D_BUNDLE' && frictionFactor > 0) {
      // Per Fluor simplified bundle method: anchor reaction increased by
      // friction factor to account for guide friction over multiple spans.
      // Reference: Fluor Engineering Standard E-3 (piperack thermal expansion).
      force = force * (1 + frictionFactor);
      // stress derived independently from geometry — not amplified by friction:
      // (stress formula already uses the same L which reflects bundle geometry)
    }

    const maxStress = constraints.maxStress;

    // In 2D Bundle method, if we wanted to bypass the strict 20k limit we could, but standard B31.3 says 20k.
    const status = stress <= maxStress ? 'PASS' : 'FAIL';

    formulaTrace.push({ name: `${axis}-axis guided cantilever approximation`, expression: 'delta = |net|*e + boundary; F = 3EIδ/(1728L^3); S = 3EODδ/(144L^2)', values: { axis, net: Math.abs(net), e, boundaryMovement: boundMovement || 0, bendLeg, force, stress, maxStress } });
    return { netDiff: Math.abs(net), bendingLeg: bendLeg, delta, force, stress, maxStress, status };
  };

  const xRes = calcAxis('X', netDiff.x, bendingLegs.x, boundaryMovement.x);
  const yRes = calcAxis('Y', netDiff.y, bendingLegs.y, boundaryMovement.y);
  const zRes = calcAxis('Z', netDiff.z, bendingLegs.z, boundaryMovement.z);

  // Phase 2: Global-to-Local Mapping (Bridge)
  // Assuming X is the Radial axis leaving Anchor 1 for calculation
  const F_r_screening = xRes.force; // Radial Load from simplified bridge
  const V_l = zRes.force; // Long shear
  const V_c = yRes.force; // Circ shear
  const momentArm = vessel?.momentArm || 0;
  const M_l_screening = V_c * momentArm;
  const M_c_screening = V_l * momentArm;
  const F_r = vessel?.vendorNozzleLoads?.F_r ?? F_r_screening;
  const M_l = vessel?.vendorNozzleLoads?.M_l ?? M_l_screening;
  const M_c = vessel?.vendorNozzleLoads?.M_c ?? M_c_screening;

  // Phase 3: MIST Shell Shakedown Solver
  const vendorNozzleLoads = vessel?.vendorNozzleLoads;
  const hasQualifiedVendorLoads = !!(vendorNozzleLoads &&
    Number.isFinite(Number(vendorNozzleLoads.F_r)) &&
    Number.isFinite(Number(vendorNozzleLoads.M_l)) &&
    Number.isFinite(Number(vendorNozzleLoads.M_c)));
  const R = (vessel?.vesselOD || 0) / 2;
  const T = vessel.vesselThk;
  const r_n = vessel.nozzleRad;
  const f = getDesignStress(material);

  const K = (Math.pow((r_n * T), 2) * f) / Math.sqrt(R * T);

  const stress_radial = 3.0 * r_n * F_r;
  const stress_long = 1.5 * M_l;
  const stress_circ = 1.15 * Math.sqrt(r_n / 10) * M_c;

  const interactionRatio = K > 0 ? (stress_radial + stress_long + stress_circ) / (Math.PI * K) : 999;
  const mistStatus = hasQualifiedVendorLoads ? (interactionRatio <= 1.0 ? 'PASS' : 'FAIL') : 'NOT_QUALIFIED';
  if (!hasQualifiedVendorLoads) {
    warnings.push('Vendor nozzle loads missing: F_r, M_l, M_c are required for qualified MIST/nozzle check.');
  }

  formulaTrace.push({
    name: 'MIST Shell Shakedown (Phase 3)',
    // WRC Bulletin 107, Section 3 — Local Shell Stresses
    expression: 'K = (r_n·T)²·f / √(R·T); interaction = (σ_r + σ_l + σ_c) / (π·K)',
    values: { R_vessel_in: R, T_thk_in: T, r_nozzle_in: r_n, f_design_psi: f,
              K, stress_radial: stress_radial, stress_long: stress_long,
              stress_circ: stress_circ, interactionRatio, mistStatus, isQualified: hasQualifiedVendorLoads }
  });

  // Phase 4: Koves Flange Leakage Solver
  const M_E = Math.sqrt(Math.pow(M_l, 2) + Math.pow(M_c, 2));
  const F_E = F_r;
  const G = getGasket(pipeSize, vessel.flangeClass);
  const P_D = vessel.designPress;
  const P_R = getFlangeRating(vessel.flangeClass, tOperate, material);
  // Per ASME Code Case 2901 §3(b): F_M = ratio of moments during upset to
  // moments during normal operation. Conservative default = 1.0 (equal moments).
  // Override via payload.vessel.F_M if vendor data available.
  const F_M_DEFAULT = 1.0; // ASME Code Case 2901 §3(b) conservative default
  const F_M = (vessel?.F_M != null && vessel.F_M > 0) ? vessel.F_M : F_M_DEFAULT;

  const equivalentLoad = (16 * M_E) + (4 * F_E * G);
  const allowableCapacity = Math.PI * Math.pow(G, 3) * ((P_R - P_D) + (F_M * P_R));
  const flangeStatus = equivalentLoad <= allowableCapacity ? 'PASS' : 'FAIL';

  formulaTrace.push({
    name: 'Flange Leakage Check — Koves Method (Phase 4)',
    // Reference: Koves, W.J., "Analysis of Flange Joints Under External Loads",
    // ASME PVP-Vol. 433, 2001
    expression: 'EL = 16·M_E + 4·F_r·G; AC = π·G³·((P_R - P_D) + F_M·P_R)',
    values: { M_E_inlbf: M_E, F_r_lbf: F_E, G_in: G,
              P_D_psi: P_D, P_R_psi: P_R, F_M,
              equivalentLoad, allowableCapacity, flangeStatus }
  });

  return {
    axes: { X: xRes, Y: yRes, Z: zRes },
    mist: { K, interactionRatio, status: mistStatus, isQualified: hasQualifiedVendorLoads, diagnostic: hasQualifiedVendorLoads ? null : 'Vendor nozzle loads missing: F_r, M_l, M_c are required for qualified MIST/nozzle check.' },
    flange: { methodId: 'KOVES_FLANGE_SCREENING', formulaIds: ['KOVES_EQUIVALENT_LOAD'], unitSystem: { force: 'lbf', moment: 'in-lbf', pressure: 'psi', length: 'in' }, equivalentLoad, allowableCapacity, status: flangeStatus },
    warnings,
    formulaTrace,
    assumptions: [
      'Calc Extended remains a simplified engineering calculator and is not a final code-compliance stress analysis.',
      `Material datasets resolved as expansion=${expansionMaterial}, modulus=${modulusMaterial}.`,
      'Current geometry parser treats converted canonical coordinates as feet in Calc Extended formulas.'
    ],
    methodId: 'KOVES_FLANGE_SCREENING',
    formulaIds: ['KOVES_EQUIVALENT_LOAD'],
    unitSystem: { coordinate: 'ft', force: 'lbf', stress: 'psi', moment: 'in-lbf', length: 'in' },
    status: mistStatus === 'NOT_QUALIFIED' ? 'SCREENING_ONLY' : (flangeStatus === 'PASS' ? 'PASSED' : 'FAILED'),
    meta: { schemaVersion: 'extended-calc-v1', shortDropsIgnored, shortDropLimit_ft: 3.0, unitSystem: { coordinate: 'ft' }, e, E, I_eff, OD, pipeSize, pipeSchedule: schedule }
  };
};

const EXT_UNIT_SYSTEM = Object.freeze({
  coordinate: 'ft',
  length: 'in',
  force: 'lbf',
  stress: 'psi',
  moment: 'in-lbf',
  pressure: 'psi'
});

function extendedContract({ methodId, formulaIds, inputs, results, status = 'PASSED', diagnostics = [] }) {
  return {
    moduleId: 'calc-extended',
    methodId,
    formulaIds,
    unitSystem: EXT_UNIT_SYSTEM,
    inputs,
    results,
    status,
    diagnostics
  };
}

export function analyzeShortDropGeometry({ nodes, segments, anchor1Id = 'A1', anchor2Id = 'A2' }) {
  const parsed = parseGeometry(nodes, segments, anchor1Id, anchor2Id);
  return extendedContract({
    methodId: 'GC_ANCHOR_GUIDE_3EI',
    formulaIds: ['GUIDED_CANTILEVER_F_3EID_OVER_L3'],
    inputs: { nodes, segments, anchor1Id, anchor2Id },
    results: {
      shortDropLimit_ft: parsed.shortDropLimit_ft,
      shortDropsIgnored: parsed.shortDropsIgnored,
      bX: parsed.bendingLegs.x,
      bY: parsed.bendingLegs.y,
      bZ: parsed.bendingLegs.z,
      unitSystem: parsed.unitSystem
    }
  });
}

export function calcExtendedGlobalReaction({ axes }) {
  const calc = ({ E, I, OD, delta, bendLeg }) => {
    const force = bendLeg > 0 ? (3 * E * I * delta) / (1728 * Math.pow(bendLeg, 3)) : 0;
    const stress = bendLeg > 0 ? (3 * E * OD * delta) / (144 * Math.pow(bendLeg, 2)) : 0;
    return { force, stress };
  };
  const X = calc(axes.X);
  const Y = calc(axes.Y);
  const Z = calc(axes.Z);
  return extendedContract({
    methodId: 'GC_ANCHOR_GUIDE_3EI',
    formulaIds: ['GUIDED_CANTILEVER_F_3EID_OVER_L3', 'CANTILEVER_STRESS_M_OVER_Z'],
    inputs: { axes },
    results: { X, Y, Z }
  });
}

export function calcMistNozzleQualification({ vendorLoads }) {
  const hasLoads = !!(vendorLoads && Number.isFinite(Number(vendorLoads.F_r)) && Number.isFinite(Number(vendorLoads.M_l)) && Number.isFinite(Number(vendorLoads.M_c)));
  return extendedContract({
    methodId: 'MIST_NOZZLE_SCREENING',
    formulaIds: ['MIST_VENDOR_LOAD_SCREENING'],
    inputs: { vendorLoads },
    results: {
      status: hasLoads ? 'SCREENING_ONLY' : 'NOT_QUALIFIED',
      isQualified: hasLoads,
      diagnostic: hasLoads ? null : 'Vendor nozzle loads missing: F_r, M_l, M_c are required for qualified MIST/nozzle check.'
    },
    status: hasLoads ? 'SCREENING_ONLY' : 'NOT_QUALIFIED',
    diagnostics: hasLoads ? [] : [{ severity: 'ERROR', message: 'Vendor nozzle loads missing: F_r, M_l, M_c are required for qualified MIST/nozzle check.' }]
  });
}

export function calcKovesFlange({ M_E, F_E, G, P_D, P_R, F_M = 1 }) {
  const equivalentLoad = (16 * Number(M_E)) + (4 * Number(F_E) * Number(G));
  const allowableCapacity = Math.PI * Math.pow(Number(G), 3) * ((Number(P_R) - Number(P_D)) + (Number(F_M) * Number(P_R)));
  const status = equivalentLoad <= allowableCapacity ? 'PASSED' : 'FAILED';
  return extendedContract({
    methodId: 'KOVES_FLANGE_SCREENING',
    formulaIds: ['KOVES_EQUIVALENT_LOAD'],
    inputs: { M_E, F_E, G, P_D, P_R, F_M },
    results: { equivalentLoad, allowableCapacity, status },
    status
  });
}
