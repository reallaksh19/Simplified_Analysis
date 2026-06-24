export const L_Bend_GM = {
  inputs: {
    material: "Carbon Steel",
    pipeSize: 8.0,
    schedule: "40",
    tOperate: 300,
    corrosionAllowance: 0,
    millTolerance: 0
  },
  vessel: {
    vesselOD: 47.24,
    vesselThk: 0.787,
    nozzleRad: 6.377,
    designPress: 435,
    flangeClass: 300,
    momentArm: 24,
  },
  constraints: { maxStress: 20000 },
  boundaryMovement: { x: 0, y: 0, z: 0 },
  nodes: [
    { id: "n1", x: 0, y: 0, z: 0 },
    { id: "n2", x: 0, y: 25, z: 0 },
    { id: "n3", x: 16.5, y: 25, z: 0 }
  ],
  segments: [
    { id: "s1", startNodeId: "n1", endNodeId: "n2" },
    { id: "s2", startNodeId: "n2", endNodeId: "n3" }
  ],
  anchors: { anchor1: "n1", anchor2: "n3" }
};

export const MultiPlane_10Leg_GM = {
  inputs: {
    material: "Carbon Steel",
    pipeSize: 8.0,
    schedule: "40",
    tOperate: 300,
    corrosionAllowance: 0,
    millTolerance: 0
  },
  vessel: {
    vesselOD: 47.24,
    vesselThk: 0.787,
    nozzleRad: 6.377,
    designPress: 435,
    flangeClass: 300,
    momentArm: 24,
  },
  constraints: { maxStress: 20000 },
  boundaryMovement: { x: 0, y: 0, z: 0 },
  nodes: [
    { id: "n1", x: 0, y: 0, z: 0 },
    { id: "n2", x: 15, y: 0, z: 0 }, // V1 E
    { id: "n3", x: 15, y: 10, z: 0 }, // V2 N
    { id: "n4", x: 15, y: 10, z: 2 }, // V3 U (short drop)
    { id: "n5", x: 35, y: 10, z: 2 }, // V4 E
    { id: "n6", x: 35, y: 5, z: 2 }, // V5 S
    { id: "n7", x: 35, y: 5, z: 14 }, // V6 U
    { id: "n8", x: 45, y: 5, z: 14 }, // V7 E
    { id: "n9", x: 45, y: 5, z: -1 }, // V8 D
    { id: "n10", x: 45, y: 30, z: -1 }, // V9 N
    { id: "n11", x: 50, y: 30, z: -1 } // V10 E
  ],
  segments: [
    { id: "s1", startNodeId: "n1", endNodeId: "n2" },
    { id: "s2", startNodeId: "n2", endNodeId: "n3" },
    { id: "s3", startNodeId: "n3", endNodeId: "n4" },
    { id: "s4", startNodeId: "n4", endNodeId: "n5" },
    { id: "s5", startNodeId: "n5", endNodeId: "n6" },
    { id: "s6", startNodeId: "n6", endNodeId: "n7" },
    { id: "s7", startNodeId: "n7", endNodeId: "n8" },
    { id: "s8", startNodeId: "n8", endNodeId: "n9" },
    { id: "s9", startNodeId: "n9", endNodeId: "n10" },
    { id: "s10", startNodeId: "n10", endNodeId: "n11" }
  ],
  anchors: { anchor1: "n1", anchor2: "n11" }
};
