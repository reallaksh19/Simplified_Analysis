export const SixLineRack_GM = {
  globalSettings: {
    anchorDistanceFt: 200, // Expanding straight leg = 100 ft per side
    defaultSpacingFt: 2.5,
    allowableStressPsi: 20000,
  },
  lines: [
    {
      id: "L1", sizeNps: 16, schedule: "40", material: "Carbon Steel", tOperate: 150,
      hasVessel: false, vesselData: {}
    },
    {
      id: "L2", sizeNps: 10, schedule: "40", material: "Carbon Steel", tOperate: 300,
      hasVessel: false, vesselData: {}
    },
    {
      id: "L3", sizeNps: 8, schedule: "40", material: "Carbon Steel", tOperate: 500,
      hasVessel: true, vesselData: { R_mm: 800, T_mm: 20, r_n_mm: 100, f_MPa: 138 } // MIST params
    },
    {
      id: "L4", sizeNps: 6, schedule: "40", material: "Carbon Steel", tOperate: 300,
      hasVessel: false, vesselData: {}
    },
    {
      id: "L5", sizeNps: 4, schedule: "40", material: "Austenitic Stainless Steel 18 Cr 8 Ni", tOperate: 500,
      hasVessel: false, vesselData: {}
    },
    {
      id: "L6", sizeNps: 2, schedule: "40", material: "Carbon Steel", tOperate: 500,
      hasVessel: false, vesselData: {}
    }
  ]
};
