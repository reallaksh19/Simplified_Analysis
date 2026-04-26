export const reportSchema = {
  version: 'calculation-report-v1',
  type: 'object',
  properties: {
    projectInfo: { type: 'object' },
    inputSource: { type: 'string', enum: ['PCF', 'sketch', 'manual', 'canonical'] },
    geometrySummary: { type: 'object' },
    pipeProperties: { type: 'object' },
    boundaryConditions: { type: 'object' },
    loads: { type: 'object' },
    calculationMethod: { type: 'string' },
    results: { type: 'object' },
    warnings: { type: 'array' },
    assumptions: { type: 'array' },
    formulas: { type: 'array' },
    engineeringLimitationNote: {
      type: 'string',
      const: 'This calculation is a simplified screening/design-aid calculation. It is not a replacement for formal code-compliant pipe stress analysis.'
    },
    appendix: { type: 'object' } // raw canonical geometry
  },
  required: [
    'projectInfo',
    'inputSource',
    'calculationMethod',
    'results',
    'warnings',
    'engineeringLimitationNote'
  ]
};
