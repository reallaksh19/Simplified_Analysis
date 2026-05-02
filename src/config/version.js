export const APP_VERSION = '2026.04.25-phase5';
export const APP_NAME = 'Simplified Calc Suite';
export const CORE_SCHEMA_VERSION = 'canonical-geometry-v1';
export const SIMPLIFIED_2D_SCHEMA_VERSION = 'simplified-2d-v1';
export const TRANSFORM_2D_SCHEMA_VERSION = 'transform-2d-v1';
export const GC3D_SCHEMA_VERSION = 'gc3d-result-v1';
export const EXTENDED_CALC_SCHEMA_VERSION = 'extended-calc-v1';
export const PIPERACK_SCHEMA_VERSION = 'piperack-result-v1';
export const REPORT_SCHEMA_VERSION = 'calculation-report-v1';
export const SPL2_BENCHMARK_SCHEMA_VERSION = 'spl2-benchmark-v1';
export const PHASE_LABEL = 'Phase 5 Pipe Rack, Reporting, SPL2 Benchmark, Cleanup';
export const BUILD_STAMP = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'development';

export const VERSION_INFO = Object.freeze({
  appName: APP_NAME,
  appVersion: APP_VERSION,
  schemaVersion: CORE_SCHEMA_VERSION,
  simplified2dSchemaVersion: SIMPLIFIED_2D_SCHEMA_VERSION,
  transform2dSchemaVersion: TRANSFORM_2D_SCHEMA_VERSION,
  gc3dSchemaVersion: GC3D_SCHEMA_VERSION,
  extendedCalcSchemaVersion: EXTENDED_CALC_SCHEMA_VERSION,
  pipeRackSchemaVersion: PIPERACK_SCHEMA_VERSION,
  reportSchemaVersion: REPORT_SCHEMA_VERSION,
  spl2BenchmarkSchemaVersion: SPL2_BENCHMARK_SCHEMA_VERSION,
  phaseLabel: PHASE_LABEL,
  buildStamp: BUILD_STAMP,
});

export const VERSION_STRING = `Ver ${APP_VERSION}`;
