import { getPipeDimensions } from '../../core/geometry/pipeSchedules.js';

export const PIPE_PROPERTY_SCHEMA_VERSION = 'sketcher-pipe-property-v18d';

export const DEFAULT_PIPE_CLASS = {
  schemaVersion: PIPE_PROPERTY_SCHEMA_VERSION,

  pipe: {
    nps: 4,
    dn: 100,
    schedule: 'STD',
    od_mm: null,
    wall_mm: null,
    material: 'CARBON STEEL',
    corrosionAllowance_mm: 1.5,
    millTolerance_percent: 12.5,
  },

  lineClass: {
    ratingClass: 300,
    faceType: 'RF',
    flangeType: 'WN',
    valveType: 'Flanged Swing check Valve',
  },

  operating: {
    operatingTemperature_C: 90,
    designTemperature_C: 150,
    operatingPressure_barg: 10,
    designPressure_barg: 20,
  },

  contents: {
    fluidDensity_kg_m3: 1000,
    fillFraction: 1,
  },

  insulation: {
    thickness_mm: 0,
    density_kg_m3: 120,
  },

  calculationFlags: {
    includeDeadweight: true,
    includeThermal: true,
  },

  dataStatus: {
    status: 'USER_DEFAULT',
    diagnostics: [],
  },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function diagnostic(severity, code, message, data = {}) {
  return { severity, code, message, data };
}

function pipeDimensions(dn, schedule) {
  try {
    return getPipeDimensions(Number(dn) || 100, schedule || 'STD') || {};
  } catch {
    return {};
  }
}

function derivePipeDefaults(inputPipe = {}) {
  const dn = finite(inputPipe.dn ?? inputPipe.bore) ?? DEFAULT_PIPE_CLASS.pipe.dn;
  const schedule = inputPipe.schedule ?? DEFAULT_PIPE_CLASS.pipe.schedule;
  const dims = pipeDimensions(dn, schedule);

  return {
    nps: inputPipe.nps ?? DEFAULT_PIPE_CLASS.pipe.nps,
    dn,
    schedule,
    od_mm: finite(inputPipe.od_mm) ?? finite(dims.od) ?? finite(dims.od_mm) ?? null,
    wall_mm: finite(inputPipe.wall_mm ?? inputPipe.wt) ?? finite(dims.wt) ?? finite(dims.wall_mm) ?? null,
    material: inputPipe.material ?? DEFAULT_PIPE_CLASS.pipe.material,
    corrosionAllowance_mm: finite(inputPipe.corrosionAllowance_mm) ?? DEFAULT_PIPE_CLASS.pipe.corrosionAllowance_mm,
    millTolerance_percent: finite(inputPipe.millTolerance_percent) ?? DEFAULT_PIPE_CLASS.pipe.millTolerance_percent,
  };
}

export function clonePipeClass(pipeClass = DEFAULT_PIPE_CLASS) {
  return clone(pipeClass);
}

export function normalizePipeClass(input = {}) {
  const source = input || {};
  const pipe = derivePipeDefaults({
    ...(DEFAULT_PIPE_CLASS.pipe || {}),
    ...(source.pipe || {}),
  });

  return {
    schemaVersion: PIPE_PROPERTY_SCHEMA_VERSION,

    pipe,

    lineClass: {
      ...DEFAULT_PIPE_CLASS.lineClass,
      ...(source.lineClass || {}),
    },

    operating: {
      ...DEFAULT_PIPE_CLASS.operating,
      ...(source.operating || {}),
    },

    contents: {
      ...DEFAULT_PIPE_CLASS.contents,
      ...(source.contents || {}),
    },

    insulation: {
      ...DEFAULT_PIPE_CLASS.insulation,
      ...(source.insulation || {}),
    },

    calculationFlags: {
      ...DEFAULT_PIPE_CLASS.calculationFlags,
      ...(source.calculationFlags || {}),
    },

    dataStatus: {
      ...DEFAULT_PIPE_CLASS.dataStatus,
      ...(source.dataStatus || {}),
    },
  };
}

export function getSegmentPipeClass(segment = {}, defaultPipeClass = DEFAULT_PIPE_CLASS) {
  return normalizePipeClass({
    ...defaultPipeClass,

    pipe: {
      ...(defaultPipeClass.pipe || {}),
      ...(segment.pipe || {}),
      dn: segment.pipe?.dn ?? segment.properties?.bore ?? segment.bore,
      bore: segment.properties?.bore ?? segment.bore,
      schedule: segment.pipe?.schedule ?? segment.properties?.schedule,
      material: segment.pipe?.material ?? segment.properties?.material ?? segment.material,
      wall_mm: segment.pipe?.wall_mm ?? segment.properties?.wt ?? segment.properties?.wall_mm,
      wt: segment.properties?.wt,
      od_mm: segment.pipe?.od_mm ?? segment.properties?.od_mm,
    },

    lineClass: {
      ...(defaultPipeClass.lineClass || {}),
      ...(segment.lineClass || {}),
      ratingClass: segment.lineClass?.ratingClass ?? segment.properties?.ratingClass,
      faceType: segment.lineClass?.faceType ?? segment.properties?.faceType,
      flangeType: segment.lineClass?.flangeType ?? segment.properties?.flangeType,
      valveType: segment.lineClass?.valveType ?? segment.properties?.valveType,
    },

    operating: {
      ...(defaultPipeClass.operating || {}),
      ...(segment.operating || {}),
      designTemperature_F: segment.properties?.designTemp,
      designTemperature_C: segment.properties?.designTemperature_C,
      designPressure_barg: segment.properties?.designPressure_barg ?? segment.properties?.pressure_barg,
    },

    contents: {
      ...(defaultPipeClass.contents || {}),
      ...(segment.contents || {}),
      fluidDensity_kg_m3: segment.properties?.fluidDensity_kg_m3,
      fillFraction: segment.properties?.fillFraction,
    },

    insulation: {
      ...(defaultPipeClass.insulation || {}),
      ...(segment.insulation || {}),
      thickness_mm: segment.properties?.insulation,
      density_kg_m3: segment.properties?.insulationDensity_kg_m3,
    },

    calculationFlags: {
      ...(defaultPipeClass.calculationFlags || {}),
      ...(segment.calculationFlags || {}),
    },

    dataStatus: {
      ...(defaultPipeClass.dataStatus || {}),
      ...(segment.dataStatus || {}),
    },
  });
}

export function applyPipeClassToSegment(segment = {}, pipeClass = DEFAULT_PIPE_CLASS) {
  const normalized = normalizePipeClass(pipeClass);

  return {
    ...segment,
    type: segment.type || segment.properties?.type || 'PIPE',

    pipe: normalized.pipe,
    lineClass: normalized.lineClass,
    operating: normalized.operating,
    contents: normalized.contents,
    insulation: normalized.insulation,
    calculationFlags: normalized.calculationFlags,
    dataStatus: normalized.dataStatus,

    properties: {
      ...(segment.properties || {}),
      type: segment.properties?.type || segment.type || 'PIPE',

      bore: normalized.pipe.dn ?? normalized.pipe.bore ?? segment.properties?.bore ?? 100,
      schedule: normalized.pipe.schedule ?? segment.properties?.schedule ?? 'STD',
      material: normalized.pipe.material ?? segment.properties?.material ?? 'CARBON STEEL',
      wt: normalized.pipe.wall_mm ?? segment.properties?.wt,
      od_mm: normalized.pipe.od_mm ?? segment.properties?.od_mm,

      ratingClass: normalized.lineClass.ratingClass ?? segment.properties?.ratingClass ?? 300,
      faceType: normalized.lineClass.faceType ?? segment.properties?.faceType ?? 'RF',
      flangeType: normalized.lineClass.flangeType ?? segment.properties?.flangeType ?? 'WN',
      valveType: normalized.lineClass.valveType ?? segment.properties?.valveType ?? 'Flanged Swing check Valve',

      designTemperature_C: normalized.operating.designTemperature_C,
      designPressure_barg: normalized.operating.designPressure_barg,
      designTemp: normalized.operating.designTemperature_F ?? segment.properties?.designTemp,

      fluidDensity_kg_m3: normalized.contents.fluidDensity_kg_m3,
      fillFraction: normalized.contents.fillFraction,

      insulation: normalized.insulation.thickness_mm ?? segment.properties?.insulation ?? 0,
      insulationDensity_kg_m3: normalized.insulation.density_kg_m3,
    },
  };
}

export function updateSegmentPipeClass(segment = {}, section, key, value, defaultPipeClass = DEFAULT_PIPE_CLASS) {
  const current = getSegmentPipeClass(segment, defaultPipeClass);
  const next = {
    ...current,
    [section]: {
      ...(current[section] || {}),
      [key]: value,
    },
  };

  return applyPipeClassToSegment(segment, next);
}

export function validateSegmentPipeProperties(segment = {}) {
  const diagnostics = [];
  const id = segment.id || 'UNKNOWN_SEGMENT';
  const pipeClass = getSegmentPipeClass(segment);

  if (!pipeClass.pipe.dn) {
    diagnostics.push(diagnostic('error', 'PIPE_DN_MISSING', `Segment ${id} is missing DN/bore.`, { segmentId: id }));
  }

  if (!pipeClass.pipe.material) {
    diagnostics.push(diagnostic('error', 'PIPE_MATERIAL_MISSING', `Segment ${id} is missing material.`, { segmentId: id }));
  }

  if (finite(pipeClass.pipe.wall_mm) === null || finite(pipeClass.pipe.wall_mm) <= 0) {
    diagnostics.push(diagnostic('warn', 'PIPE_WALL_THICKNESS_MISSING', `Segment ${id} is missing wall thickness.`, { segmentId: id }));
  }

  if (!pipeClass.lineClass?.ratingClass && !segment.properties?.ratingClass) {
    diagnostics.push(diagnostic('warn', 'PIPE_RATING_CLASS_MISSING', `Segment ${id} is missing rating/class. Component insertion may fall back to default class.`, { segmentId: id }));
  }

  if (finite(pipeClass.operating.designTemperature_C) === null && finite(pipeClass.operating.designTemperature_F) === null) {
    diagnostics.push(diagnostic('warn', 'PIPE_DESIGN_TEMPERATURE_MISSING', `Segment ${id} is missing design temperature.`, { segmentId: id }));
  }

  if (finite(pipeClass.operating.designPressure_barg) === null) {
    diagnostics.push(diagnostic('warn', 'PIPE_DESIGN_PRESSURE_MISSING', `Segment ${id} is missing design pressure.`, { segmentId: id }));
  }

  if (pipeClass.calculationFlags.includeDeadweight && finite(pipeClass.contents.fluidDensity_kg_m3) === null) {
    diagnostics.push(diagnostic('warn', 'PIPE_FLUID_DENSITY_MISSING', `Segment ${id} is missing fluid density for deadweight calculation.`, { segmentId: id }));
  }

  return {
    ok: diagnostics.every((item) => item.severity !== 'error'),
    status: diagnostics.some((item) => item.severity === 'error') ? 'NOT_QUALIFIED' : diagnostics.length ? 'PASSED_WITH_WARNINGS' : 'PASSED',
    diagnostics,
    pipeClass,
  };
}

export function buildPipeClassSummary(pipeClass = DEFAULT_PIPE_CLASS) {
  const normalized = normalizePipeClass(pipeClass);
  return {
    dn: normalized.pipe.dn,
    schedule: normalized.pipe.schedule,
    wall_mm: normalized.pipe.wall_mm,
    material: normalized.pipe.material,
    ratingClass: normalized.lineClass.ratingClass,
    faceType: normalized.lineClass.faceType,
    flangeType: normalized.lineClass.flangeType,
    designTemperature_C: normalized.operating.designTemperature_C,
    designPressure_barg: normalized.operating.designPressure_barg,
    fluidDensity_kg_m3: normalized.contents.fluidDensity_kg_m3,
    insulationThickness_mm: normalized.insulation.thickness_mm,
    includeDeadweight: normalized.calculationFlags.includeDeadweight,
    includeThermal: normalized.calculationFlags.includeThermal,
  };
}
