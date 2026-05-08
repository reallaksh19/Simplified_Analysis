import { resolvePipeProperty } from '../../data/pipeProperties.js';
import { resolveMaterial } from '../../data/materialProperties.js';

export const DATA_STATUS = Object.freeze({
  PASSED: 'PASSED',
  MISSING_DATA: 'MISSING_DATA',
  NOT_QUALIFIED: 'NOT_QUALIFIED',
  SCREENING_APPROXIMATION: 'SCREENING_APPROXIMATION',
  USER_DEFINED: 'USER_DEFINED',
});

/**
 * Resolve pipe section properties for a given NPS and schedule.
 * Wraps resolvePipeProperty() from pipeProperties.js.
 *
 * @param {Object} params - { nps, schedule }
 * @returns {Object} { status, isQualified, source, value, diagnostics }
 */
export function resolvePipeSection({ nps, schedule } = {}) {
  if (!Number.isFinite(nps) || !schedule) {
    return {
      status: DATA_STATUS.MISSING_DATA,
      isQualified: false,
      source: 'engineering-data/resolveEngineeringData.js',
      value: null,
      diagnostics: [
        {
          code: 'INVALID_PIPE_INPUT',
          severity: 'ERROR',
          message: 'Pipe resolution requires valid nps and schedule parameters.'
        }
      ]
    };
  }

  const result = resolvePipeProperty({ nps, schedule });

  return {
    status: result.status === 'PASSED' ? DATA_STATUS.PASSED : DATA_STATUS.MISSING_DATA,
    isQualified: result.isQualified,
    source: result.source || 'Project screening master DB / ASME B36.10M reference required before final issue',
    value: result.value,
    diagnostics: result.diagnostics || []
  };
}

/**
 * Resolve material properties at a given temperature.
 * Wraps resolveMaterial() from materialProperties.js.
 *
 * @param {Object} params - { materialId, temperature_F }
 * @returns {Object} { status, isQualified, source, value, diagnostics }
 */
export function resolveMaterialAtTemperature({ materialId, temperature_F } = {}) {
  if (!materialId || !Number.isFinite(temperature_F)) {
    return {
      status: DATA_STATUS.MISSING_DATA,
      isQualified: false,
      source: 'engineering-data/resolveEngineeringData.js',
      value: null,
      diagnostics: [
        {
          code: 'INVALID_MATERIAL_INPUT',
          severity: 'ERROR',
          message: 'Material resolution requires valid materialId and temperature_F parameters.'
        }
      ]
    };
  }

  const result = resolveMaterial({ materialId, temperature_F });

  let status = DATA_STATUS.MISSING_DATA;
  if (result.status === 'PASSED') {
    status = DATA_STATUS.PASSED;
  } else if (result.status === 'NOT_QUALIFIED') {
    status = DATA_STATUS.NOT_QUALIFIED;
  }

  return {
    status,
    isQualified: result.isQualified,
    source: result.source || 'Project master DB',
    value: result.value,
    diagnostics: result.diagnostics || []
  };
}

/**
 * Resolve both pipe and material for a calculation.
 * Combines resolvePipeSection() and resolveMaterialAtTemperature().
 *
 * @param {Object} params - { nps, schedule, materialId, temperature_F }
 * @returns {Object} { pipe, material, isFullyQualified, diagnostics }
 */
export function resolveEngineeringDataForCalculation({
  nps,
  schedule,
  materialId,
  temperature_F
} = {}) {
  const pipe = resolvePipeSection({ nps, schedule });
  const material = resolveMaterialAtTemperature({ materialId, temperature_F });

  const isFullyQualified = pipe.isQualified && material.isQualified;

  const allDiagnostics = [
    ...pipe.diagnostics,
    ...material.diagnostics
  ];

  return {
    pipe,
    material,
    isFullyQualified,
    diagnostics: allDiagnostics
  };
}
