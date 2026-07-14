export const ENGINEERING_PROPERTY_SPECS = Object.freeze({
  outerDiameterMm: numeric('mm', ['PIPE_OD', 'PIPEOD', 'OD_MM', 'OUTSIDE_DIAMETER_MM', 'OUTSIDE_DIAMETER', 'OD']),
  wallThicknessMm: numeric('mm', ['WALL_THICKNESS_MM', 'WALLTHICKNESSMM', 'WALL_THICKNESS', 'THICKNESS']),
  nominalBoreMm: numeric('mm', ['NOMINAL_BORE_MM', 'NOMINALBOREMM', 'NPS_MM', 'BORE_MM', 'BORE']),
  materialName: text(['MATERIAL_NAME', 'MATERIAL', 'MATERIALCODE']),
  materialDensityKgM3: numeric('kg/m3', ['MATERIAL_DENSITY_KG_M3', 'MATERIALDENSITYKGM3']),
  unitPipeWeightKgPerM: numeric('kg/m', ['UNIT_PIPE_WEIGHT_KG_PER_M', 'PIPE_WEIGHT_KG_PER_M', 'PIPEWEIGHTKGPM']),
  componentWeightKg: numeric('kg', ['COMPONENT_WEIGHT_KG', 'COMPONENTWEIGHTKG', 'BEST_WEIGHT_KG', 'WEIGHT_KG']),
  insulationThicknessMm: numeric('mm', ['INSULATION_THICKNESS_MM', 'INSULATIONTHICKNESSMM']),
  insulationDensityKgM3: numeric('kg/m3', ['INSULATION_DENSITY_KG_M3', 'INSULATIONDENSITYKGM3']),
  insulationWeightKgPerM: numeric('kg/m', ['INSULATION_WEIGHT_KG_PER_M', 'INSULATIONWEIGHTKGPM']),
  fluidDensityOpeKgM3: numeric('kg/m3', ['FLUID_DENSITY_OPE_KG_M3', 'FLUIDDENSITYOPEKGM3', 'FLUID_DENSITY_KG_M3']),
  fluidDensityHydKgM3: numeric('kg/m3', ['FLUID_DENSITY_HYD_KG_M3', 'FLUIDDENSITYHYDKGM3']),
  fluidWeightOpeKgPerM: numeric('kg/m', ['FLUID_WT_OPE_KG_M', 'FLUID_WEIGHT_OPE_KG_PER_M', 'FLUIDWEIGHTOPEKGPM']),
  fluidWeightHydKgPerM: numeric('kg/m', ['FLUID_WT_HYD_KG_M', 'FLUID_WEIGHT_HYD_KG_PER_M', 'FLUIDWEIGHTHYDKGPM']),
});

export const COMPATIBILITY_EVIDENCE_SPECS = Object.freeze({
  sourceLengthMm: numeric('mm', ['LENGTH_MM', 'LENGTHMM']),
  sourceChainageStartMm: numeric('mm', ['CHAINAGE_START_MM', 'CHAINAGESTARTMM']),
  sourceChainageEndMm: numeric('mm', ['CHAINAGE_END_MM', 'CHAINAGEENDMM']),
  sourceChainageCenterMm: numeric('mm', ['CHAINAGE_CENTER_MM', 'CHAINAGECENTERMM']),
  supportVerticalCapability: text(['VERTICAL_CAPABILITY', 'SUPPORT_VERTICAL_CAPABILITY']),
  supportType: text(['SUPPORT_TYPE', 'SUPPORTTYPE']),
});

function numeric(unit, aliases) {
  return Object.freeze({ kind: 'number', unit, aliases: Object.freeze(aliases) });
}

function text(aliases) {
  return Object.freeze({ kind: 'string', unit: '', aliases: Object.freeze(aliases) });
}
