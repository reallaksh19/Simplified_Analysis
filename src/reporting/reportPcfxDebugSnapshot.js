import { PCFX_ROUNDTRIP_SCHEMA_VERSION, PCFX_VERSION } from '../core/pcfx/pcfxRoundtripAdapter.js';

export const REPORT_PCFX_DEBUG_SCHEMA_VERSION = 'report-pcfx-debug-snapshot-v1';

export function createReportPCFXDebugSnapshot({ activeReportContext, reportPayload, jsonSnapshot, revision, reportReviewState } = {}) {
  const result = activeReportContext?.result || reportPayload?.result || {};
  return {
    schemaVersion: PCFX_ROUNDTRIP_SCHEMA_VERSION,
    pcfxVersion: PCFX_VERSION,
    debugProfile: REPORT_PCFX_DEBUG_SCHEMA_VERSION,
    project: 'SIMPLIFIED_ANALYSIS_REPORT_DEBUG',
    units: { reportUnitSystem: result.unitSystem || reportPayload?.unitSystem || 'imperial' },
    nodes: {},
    segments: [],
    components: [],
    diagnostics: activeReportContext?.diagnostics || [],
    lossContract: [],
    rawAttributes: {},
    normalized: {
      moduleId: activeReportContext?.moduleId || reportPayload?.module || null,
      methodId: activeReportContext?.methodId || reportPayload?.methodId || null,
      formulaIds: result.formulaIds || reportPayload?.formulaIds || [],
      settingsHash: activeReportContext?.settingsHash || reportPayload?.settingsHash || null,
      status: result.status || reportPayload?.status || null,
      dataStatus: activeReportContext?.dataStatus || reportPayload?.engineeringDataSource || null,
      componentDataStatus: activeReportContext?.componentDataStatus || reportPayload?.componentDataStatus || null,
    },
    derived: {
      reportStableHash: revision?.reportStableHash || null,
      revisionId: revision?.revisionId || null,
      issueStatus: revision?.issueStatus || reportReviewState?.issueStatus || null,
      issueType: revision?.issueType || reportReviewState?.issueType || null,
      reviewerChecker: revision?.reviewerChecker || null,
    },
    reportPayload: reportPayload || null,
    jsonSnapshot: jsonSnapshot || null,
    revision: revision || null,
  };
}
