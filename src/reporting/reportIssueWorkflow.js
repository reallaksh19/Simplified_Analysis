export const REPORT_ISSUE_SCHEMA_VERSION = 'report-issue-workflow-v1';

export const REPORT_ISSUE_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  CHECKED: 'CHECKED',
  ISSUED: 'ISSUED',
  VOID: 'VOID',
});

export const REPORT_ISSUE_TYPE = Object.freeze({
  SCREENING_ISSUE: 'SCREENING_ISSUE',
  FINAL_ISSUE: 'FINAL_ISSUE',
});

const BLOCKING_STATUSES = new Set(['NOT_QUALIFIED', 'MISSING_DATA', 'UNSUPPORTED_GEOMETRY', 'BENCHMARK_NOT_CERTIFIED', 'FAILED']);
const NON_ISSUE_DATA_STATUSES = new Set(['MISSING_DATA', 'NOT_QUALIFIED', 'UNSUPPORTED_GEOMETRY']);

function fnvHash(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function canonicalize(value, exclude = new Set()) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) return '[' + value.map(v => canonicalize(v, exclude)).join(',') + ']';
  const keys = Object.keys(value).filter(k => !exclude.has(k)).sort();
  return '{' + keys.map(k => `"${k}":${canonicalize(value[k], exclude)}`).join(',') + '}';
}

export function stableReportWorkflowHash(input) {
  const exclude = new Set(['generatedAt', 'timestamp', 'createdAt']);
  const canonical = canonicalize(input, exclude);
  return 'rpt-' + fnvHash(canonical);
}

export function evaluateReportIssueEligibility({
  activeReportContext,
  reportPayload,
  resultsStale,
  targetStatus = REPORT_ISSUE_STATUS.DRAFT,
  issueType = REPORT_ISSUE_TYPE.SCREENING_ISSUE,
  reviewerChecker = {},
  benchmarkCertificationRequired = false,
} = {}) {
  const blockers = [];
  const warnings = [];

  const result = activeReportContext?.result || reportPayload?.result || {};
  const resultStatus = result.status || reportPayload?.status || null;
  const dataStatus = result.dataStatus?.status || result.dataStatus || reportPayload?.engineeringDataSource?.status || null;
  const engineeringLevel = result.engineeringLevel || reportPayload?.engineeringLevel || null;
  const benchmarkStatus = activeReportContext?.benchmarkStatus || reportPayload?.benchmarkStatus || 'NOT_RUN';
  const methodId = activeReportContext?.methodId || reportPayload?.methodId || null;
  const formulaIds = activeReportContext?.result?.formulaIds || reportPayload?.formulaIds || [];

  if (!activeReportContext) blockers.push({ code: 'NO_ACTIVE_REPORT', message: 'No active calculation report.' });
  if (!methodId || methodId === 'UNKNOWN_METHOD') blockers.push({ code: 'MISSING_METHOD_ID', message: 'Method ID is missing or unknown.' });
  if (!Array.isArray(formulaIds) || formulaIds.length === 0) blockers.push({ code: 'MISSING_FORMULA_IDS', message: 'Formula IDs are missing.' });
  if (resultsStale) blockers.push({ code: 'STALE_RESULTS', message: 'Results are stale. Recalculate before issuing.' });
  if (resultStatus && BLOCKING_STATUSES.has(resultStatus)) blockers.push({ code: 'SOLVER_NOT_QUALIFIED', message: `Solver status ${resultStatus} blocks issue.` });
  if (dataStatus && NON_ISSUE_DATA_STATUSES.has(dataStatus)) blockers.push({ code: 'DATA_NOT_QUALIFIED', message: `Data status ${dataStatus} blocks issue.` });
  if (benchmarkCertificationRequired && benchmarkStatus !== 'PASSED') blockers.push({ code: 'BENCHMARK_NOT_CERTIFIED', message: 'Benchmark certification required but not passed.' });

  if (targetStatus === REPORT_ISSUE_STATUS.CHECKED) {
    if (!reviewerChecker.checkedBy) blockers.push({ code: 'CHECKER_REQUIRED', message: 'Checked By is required for CHECKED status.' });
  }

  if (targetStatus === REPORT_ISSUE_STATUS.ISSUED) {
    if (!reviewerChecker.preparedBy) blockers.push({ code: 'PREPARED_BY_REQUIRED', message: 'Prepared By is required for ISSUED status.' });
    if (!reviewerChecker.checkedBy) blockers.push({ code: 'CHECKED_BY_REQUIRED', message: 'Checked By is required for ISSUED status.' });
    if (!reviewerChecker.approvedBy) blockers.push({ code: 'APPROVED_BY_REQUIRED', message: 'Approved By is required for ISSUED status.' });
    if (engineeringLevel === 'SCREENING' && issueType === REPORT_ISSUE_TYPE.FINAL_ISSUE) {
      blockers.push({ code: 'SCREENING_LEVEL_NOT_FINAL', message: 'SCREENING level methods cannot be issued as FINAL_ISSUE.' });
    }
  }

  const canSaveDraft = !!activeReportContext;
  const canCheck = canSaveDraft && !blockers.some(b => ['NO_ACTIVE_REPORT', 'STALE_RESULTS', 'SOLVER_NOT_QUALIFIED', 'DATA_NOT_QUALIFIED'].includes(b.code));
  const canIssue = blockers.length === 0;

  return { schemaVersion: REPORT_ISSUE_SCHEMA_VERSION, targetStatus, issueType, canSaveDraft, canCheck, canIssue, blockers, warnings, resultStatus, dataStatus, engineeringLevel, benchmarkStatus };
}

export function createReportRevision({
  activeReportContext,
  reportPayload,
  jsonSnapshot,
  markdown,
  reviewerChecker = {},
  issueStatus = REPORT_ISSUE_STATUS.DRAFT,
  issueType = REPORT_ISSUE_TYPE.SCREENING_ISSUE,
  sequence = 1,
  eligibility,
} = {}) {
  const revisionId = stableReportWorkflowHash({ activeReportContext, reviewerChecker, sequence, issueStatus });
  return {
    schemaVersion: REPORT_ISSUE_SCHEMA_VERSION,
    revisionId,
    sequence,
    issueStatus,
    issueType,
    title: activeReportContext?.title || reportPayload?.title || 'Engineering Calculation Sheet',
    moduleId: activeReportContext?.moduleId || reportPayload?.module || 'unknown-module',
    methodId: activeReportContext?.methodId || reportPayload?.methodId || 'UNKNOWN_METHOD',
    settingsHash: activeReportContext?.settingsHash || reportPayload?.settingsHash || null,
    reportStableHash: stableReportWorkflowHash(reportPayload || {}),
    reviewerChecker,
    eligibility: eligibility || null,
    markdown: markdown || '',
    html: '',
    jsonSnapshot: jsonSnapshot || {},
  };
}
