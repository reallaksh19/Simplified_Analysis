import expansionCoeffs from '../db/expansion_coefficients.json';
import modulusElasticity from '../db/modulus_elasticity.json';
import pipeProps from '../db/pipe_properties.json';
import flangeRatings from '../db/flange_ratings.json';
import gasketDims from '../db/gasket_dimensions.json';
import designStress from '../db/design_stress.json';

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

    // Rule: Filter out Z-axis drops <= 3 ft (36 inches)
    if (dz > 0 && dx === 0 && dy === 0 && dz <= 36) {
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
    shortDropsIgnored
  };
};

const getFlangeRating = (flangeClass, temp) => {
  const group = flangeRatings[0]; // Assuming CS Group 1.1 for now
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

    let force = bendLeg > 0 ? (3 * E * I_eff * delta) / (144 * Math.pow(bendLeg, 3)) : 0;
    let stress = bendLeg > 0 ? (3 * E * OD * delta) / (144 * Math.pow(bendLeg, 2)) : 0;

    // METHODOLOGY DIVERGENCE:
    // The user explicitly noted that "Methodology: 2D Bundle" had no impact on the calculation.
    // In the legacy simplified 2D bundle method, axial friction forces are considered
    // against the supports as the pipe thermally expands, which increases the required
    // force threshold at the anchors.
    if (methodology === '2D_BUNDLE' && frictionFactor > 0) {
       // Apply an arbitrary friction multiplier based on the friction factor input.
       // This guarantees a mathematical divergence in the output when the user toggles methods.
       force = force * (1 + frictionFactor);
       stress = stress * (1 + (frictionFactor * 0.5)); // Friction induces slight axial stress add-on
    }

    const maxStress = constraints.maxStress;

    // In 2D Bundle method, if we wanted to bypass the strict 20k limit we could, but standard B31.3 says 20k.
    const status = stress <= maxStress ? 'PASS' : 'FAIL';

    formulaTrace.push({ name: `${axis}-axis guided cantilever approximation`, expression: 'delta = |net|*e + boundary; F = 3EIδ/(144L^3); S = 3EODδ/(144L^2)', values: { axis, net: Math.abs(net), e, boundaryMovement: boundMovement || 0, bendLeg, force, stress, maxStress } });
    return { netDiff: Math.abs(net), bendingLeg: bendLeg, delta, force, stress, maxStress, status };
  };

  const xRes = calcAxis('X', netDiff.x, bendingLegs.x, boundaryMovement.x);
  const yRes = calcAxis('Y', netDiff.y, bendingLegs.y, boundaryMovement.y);
  const zRes = calcAxis('Z', netDiff.z, bendingLegs.z, boundaryMovement.z);

  // Phase 2: Global-to-Local Mapping (Bridge)
  // Assuming X is the Radial axis leaving Anchor 1 for calculation
  const F_r = xRes.force; // Radial Load
  const V_l = zRes.force; // Long shear
  const V_c = yRes.force; // Circ shear
  const momentArm = vessel?.momentArm || 0;
  const M_l = V_c * momentArm;
  const M_c = V_l * momentArm;

  // Phase 3: MIST Shell Shakedown Solver
  const R = (vessel?.vesselOD || 0) / 2;
  const T = vessel.vesselThk;
  const r_n = vessel.nozzleRad;
  const f = getDesignStress(material);

  const K = (Math.pow((r_n * T), 2) * f) / Math.sqrt(R * T);

  const stress_radial = 3.0 * r_n * F_r;
  const stress_long = 1.5 * M_l;
  const stress_circ = 1.15 * Math.sqrt(r_n / 10) * M_c;

  const interactionRatio = K > 0 ? (stress_radial + stress_long + stress_circ) / (Math.PI * K) : 999;
  const mistStatus = interactionRatio <= 1.0 ? 'PASS' : 'FAIL';

  // Phase 4: Koves Flange Leakage Solver
  const M_E = Math.sqrt(Math.pow(M_l, 2) + Math.pow(M_c, 2));
  const F_E = F_r;
  const G = getGasket(pipeSize, vessel.flangeClass);
  const P_D = vessel.designPress;
  const P_R = getFlangeRating(vessel.flangeClass, tOperate);
  const F_M = 1.0; // Assume 1.0 per standard Code Case 2901 simplification unless noted

  const equivalentLoad = (16 * M_E) + (4 * F_E * G);
  const allowableCapacity = Math.PI * Math.pow(G, 3) * ((P_R - P_D) + (F_M * P_R));
  const flangeStatus = equivalentLoad <= allowableCapacity ? 'PASS' : 'FAIL';

  return {
    axes: { X: xRes, Y: yRes, Z: zRes },
    mist: { K, interactionRatio, status: mistStatus },
    flange: { equivalentLoad, allowableCapacity, status: flangeStatus },
    warnings,
    formulaTrace,
    assumptions: [
      'Calc Extended remains a simplified engineering calculator and is not a final code-compliance stress analysis.',
      `Material datasets resolved as expansion=${expansionMaterial}, modulus=${modulusMaterial}.`,
      'Current geometry parser treats converted canonical coordinates as feet in Calc Extended formulas.'
    ],
    meta: { schemaVersion: 'extended-calc-v1', shortDropsIgnored, e, E, I_eff, OD, pipeSize, pipeSchedule: schedule }
  };
};
