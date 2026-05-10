const GRAVITY_M_S2 = 9.80665;
const DEFAULT_STEEL_DENSITY_KG_M3 = 7850;

function finite(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function mmToM(value) {
  return finite(value) / 1000;
}

function segmentLengthM(segment) {
  return mmToM(segment.length_mm);
}

function pipeMetalMassKg(segment) {
  const od_m = mmToM(segment.pipe?.od_mm);
  const wall_m = mmToM(segment.pipe?.wall_mm);
  const length_m = segmentLengthM(segment);
  const density = finite(segment.pipe?.materialDensity_kg_m3, DEFAULT_STEEL_DENSITY_KG_M3);

  if (!(od_m > 0) || !(wall_m > 0) || !(length_m > 0)) return 0;

  const id_m = Math.max(od_m - 2 * wall_m, 0);
  const metalArea_m2 = (Math.PI / 4) * ((od_m ** 2) - (id_m ** 2));

  return metalArea_m2 * length_m * density;
}

function fluidMassKg(segment) {
  const od_m = mmToM(segment.pipe?.od_mm);
  const wall_m = mmToM(segment.pipe?.wall_mm);
  const length_m = segmentLengthM(segment);
  const density = finite(segment.contents?.fluidDensity_kg_m3, 0);

  if (!(od_m > 0) || !(wall_m > 0) || !(length_m > 0) || density < 0) return 0;

  const id_m = Math.max(od_m - 2 * wall_m, 0);
  const fluidArea_m2 = (Math.PI / 4) * (id_m ** 2);

  return fluidArea_m2 * length_m * density;
}

function insulationMassKg(segment) {
  const od_m = mmToM(segment.pipe?.od_mm);
  const thickness_m = mmToM(segment.insulation?.thickness_mm);
  const length_m = segmentLengthM(segment);
  const density = finite(segment.insulation?.density_kg_m3, 0);

  if (!(od_m > 0) || !(thickness_m > 0) || !(length_m > 0) || density < 0) return 0;

  const insulationOuterDiameter_m = od_m + 2 * thickness_m;
  const insulationArea_m2 =
    (Math.PI / 4) * ((insulationOuterDiameter_m ** 2) - (od_m ** 2));

  return insulationArea_m2 * length_m * density;
}

function componentMassKg(segment) {
  return finite(segment.component?.componentWeight_kg, 0);
}

function buildSupportMap(model) {
  const map = new Map();

  for (const support of model.supports || []) {
    map.set(support.nodeId, {
      supportId: support.id,
      nodeId: support.nodeId,
      type: support.type,
      restraint: support.restraint,
      frictionFactor: support.frictionFactor,
      reaction_N: 0,
      assignedSegments: [],
    });
  }

  return map;
}

function getSegmentSupportNodes(segment, supportMap) {
  const nodes = [];

  if (supportMap.has(segment.startNode)) nodes.push(segment.startNode);
  if (supportMap.has(segment.endNode)) nodes.push(segment.endNode);

  return nodes;
}

export function solve3DSimplifiedSupportLoads(model = {}) {
  const supportMap = buildSupportMap(model);
  const segmentLoads = [];
  const diagnostics = [];

  for (const segment of model.segments || []) {
    const metalMass_kg = pipeMetalMassKg(segment);
    const fluidMass_kg = fluidMassKg(segment);
    const insulationMass_kg = insulationMassKg(segment);
    const componentMass_kg = componentMassKg(segment);

    const totalMass_kg =
      metalMass_kg +
      fluidMass_kg +
      insulationMass_kg +
      componentMass_kg;

    const totalWeight_N = totalMass_kg * GRAVITY_M_S2;
    const supportNodeIds = getSegmentSupportNodes(segment, supportMap);

    if (supportNodeIds.length === 0) {
      diagnostics.push({
        severity: 'warn',
        code: 'SUPPORT_LOAD_SEGMENT_HAS_NO_SUPPORT_NODE',
        message: `Segment ${segment.id} is not connected to a support node. Its weight is not assigned to reactions.`,
        data: { segmentId: segment.id },
      });
    }

    const reactionShare_N =
      supportNodeIds.length > 0 ? totalWeight_N / supportNodeIds.length : 0;

    for (const nodeId of supportNodeIds) {
      const support = supportMap.get(nodeId);
      support.reaction_N += reactionShare_N;
      support.assignedSegments.push(segment.id);
    }

    segmentLoads.push({
      segmentId: segment.id,
      type: segment.type,
      length_mm: round(segment.length_mm, 3),

      metalMass_kg: round(metalMass_kg, 6),
      fluidMass_kg: round(fluidMass_kg, 6),
      insulationMass_kg: round(insulationMass_kg, 6),
      componentMass_kg: round(componentMass_kg, 6),
      totalMass_kg: round(totalMass_kg, 6),
      totalWeight_N: round(totalWeight_N, 3),

      supportNodeIds,
      reactionShare_N: round(reactionShare_N, 3),
      formulaIds: [
        'SL-E-001-PIPE-METAL-MASS',
        'SL-E-002-FLUID-MASS',
        'SL-E-003-INSULATION-MASS',
        'SL-E-004-COMPONENT-MASS',
        'SL-E-005-SIMPLE-END-SUPPORT-REACTION',
      ],
    });
  }

  const supportReactions = [...supportMap.values()].map((support) => ({
    ...support,
    reaction_N: round(support.reaction_N, 3),
    reaction_kgf: round(support.reaction_N / GRAVITY_M_S2, 6),
  }));

  const totalSegmentWeight_N = segmentLoads.reduce(
    (sum, item) => sum + item.totalWeight_N,
    0
  );
  const totalReaction_N = supportReactions.reduce(
    (sum, item) => sum + item.reaction_N,
    0
  );

  const imbalance_N = totalSegmentWeight_N - totalReaction_N;

  if (Math.abs(imbalance_N) > 0.01) {
    diagnostics.push({
      severity: 'warn',
      code: 'SUPPORT_LOAD_REACTION_IMBALANCE',
      message: 'Total support reaction does not match total calculated segment weight.',
      data: {
        totalSegmentWeight_N: round(totalSegmentWeight_N, 3),
        totalReaction_N: round(totalReaction_N, 3),
        imbalance_N: round(imbalance_N, 3),
      },
    });
  }

  return {
    schemaVersion: '3d-simplified-support-loads-v1',
    methodId: 'SL-E-SIMPLE-END-SUPPORT-WEIGHT-SHARE',
    assumptions: [
      'Vertical support load only.',
      'Each segment weight is shared equally by supported end nodes.',
      'No span continuity, stiffness distribution, spring support, friction redistribution, seismic, wind, slug, or dynamic effect is included.',
      'Pipe metal mass uses thin/actual annulus from OD and wall thickness.',
      'Fluid mass uses internal bore derived from OD minus two wall thicknesses.',
      'Insulation mass uses cylindrical annulus around pipe OD.',
      'Inline component mass is assigned to the segment and shared by connected support nodes.',
    ],
    formulas: [
      {
        id: 'SL-E-001-PIPE-METAL-MASS',
        expression: 'm_pipe = (π/4) × (OD² − ID²) × L × ρ_pipe',
      },
      {
        id: 'SL-E-002-FLUID-MASS',
        expression: 'm_fluid = (π/4) × ID² × L × ρ_fluid',
      },
      {
        id: 'SL-E-003-INSULATION-MASS',
        expression: 'm_ins = (π/4) × (OD_ins² − OD²) × L × ρ_ins',
      },
      {
        id: 'SL-E-004-COMPONENT-MASS',
        expression: 'm_component = assigned inline component mass',
      },
      {
        id: 'SL-E-005-SIMPLE-END-SUPPORT-REACTION',
        expression: 'R_support = W_segment / supported_end_count',
      },
    ],
    summary: {
      segments: segmentLoads.length,
      supports: supportReactions.length,
      totalSegmentWeight_N: round(totalSegmentWeight_N, 3),
      totalReaction_N: round(totalReaction_N, 3),
      imbalance_N: round(imbalance_N, 3),
    },
    segmentLoads,
    supportReactions,
    diagnostics,
  };
}
