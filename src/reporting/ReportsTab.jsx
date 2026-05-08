import React from 'react';
import { useAppStore } from '../store/appStore';
import { createEngineeringCalculationReport, renderMarkdownCalculationSheet } from './index';
import { buildReportPayload } from './buildReportPayload.js';
import {
  evaluateReportIssueEligibility,
  createReportRevision,
  REPORT_ISSUE_STATUS,
  REPORT_ISSUE_TYPE,
} from './reportIssueWorkflow.js';
import {
  createReportExportBundle,
  makeDownloadableTextFile,
} from './reportExportUtils.js';

export const ReportsTab = () => {
  const activeReportContext = useAppStore((state) => state.activeReportContext);
  const resultsStale = useAppStore((state) => state.resultsStale);
  const currentBenchmarkMock = useAppStore((state) => state.currentBenchmarkMock);
  const engineeringDefaults = useAppStore((state) => state.engineeringDefaults);
  const reportReviewState = useAppStore((state) => state.reportReviewState);
  const updateReportReviewState = useAppStore((state) => state.updateReportReviewState);
  const reportHistory = useAppStore((state) => state.reportHistory);
  const saveReportRevision = useAppStore((state) => state.saveReportRevision);
  const reportRevisionSequence = useAppStore((state) => state.reportRevisionSequence);

  // If no active report context, show placeholder
  if (!activeReportContext) {
    return (
      <div data-testid="reports-tab" style={{ padding: 24, color: '#fff', overflow: 'auto', height: '100%' }}>
        <h2 style={{ marginTop: 0 }}>Reports</h2>
        <div data-testid="no-active-report" style={{ color: '#cbd5e1', marginTop: 16 }}>
          No active calculation report is available. Run a calculation first.
        </div>
      </div>
    );
  }

  // Build report payload from active context
  const reportPayload = buildReportPayload(activeReportContext, resultsStale);
  const report = createEngineeringCalculationReport(reportPayload);
  const markdown = renderMarkdownCalculationSheet(report);
  const jsonSnapshot = reportPayload;

  // Build reviewer/checker object
  const reviewerChecker = {
    preparedBy: reportReviewState.preparedBy,
    checkedBy: reportReviewState.checkedBy,
    approvedBy: reportReviewState.approvedBy,
  };

  // Evaluate eligibility
  const eligibility = evaluateReportIssueEligibility({
    activeReportContext,
    reportPayload,
    resultsStale,
    targetStatus: reportReviewState.issueStatus,
    issueType: reportReviewState.issueType,
    reviewerChecker,
    benchmarkCertificationRequired: activeReportContext?.settings?.benchmarkCertificationRequired === true,
  });

  // Create revision for saving
  const createRevision = () => {
    const revision = createReportRevision({
      activeReportContext,
      reportPayload,
      jsonSnapshot,
      markdown,
      reviewerChecker,
      issueStatus: reportReviewState.issueStatus,
      issueType: reportReviewState.issueType,
      sequence: reportRevisionSequence + 1,
      eligibility,
    });
    saveReportRevision(revision);
    return revision;
  };

  // Export bundle
  const exportBundle = createReportExportBundle({ report, markdown, jsonSnapshot, revision: { sequence: reportRevisionSequence + 1 } });

  const handleExport = (fileObj) => {
    const blob = new Blob([fileObj.content], { type: fileObj.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileObj.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div data-testid="reports-tab" style={{ padding: 24, color: '#fff', overflow: 'auto', height: '100%' }}>
      <h2 style={{ marginTop: 0 }}>Reports</h2>
      {resultsStale && (
        <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          STALE — Recalculate before issue.
        </div>
      )}
      <p style={{ color: '#cbd5e1' }}>Reports include method ID, formula IDs, unit system, benchmark status, warnings, diagnostics, and reviewer/checker fields.</p>

      {/* Checker Workflow Panel */}
      <div data-testid="report-checker-workflow" style={{ background: '#1a1a2e', border: '1px solid #334155', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Checker Workflow</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8' }}>Prepared By</label>
            <input
              data-testid="report-prepared-by"
              type="text"
              value={reportReviewState.preparedBy}
              onChange={(e) => updateReportReviewState({ preparedBy: e.target.value })}
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', boxSizing: 'border-box' }}
              placeholder="Engineer name"
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8' }}>Checked By</label>
            <input
              data-testid="report-checked-by"
              type="text"
              value={reportReviewState.checkedBy}
              onChange={(e) => updateReportReviewState({ checkedBy: e.target.value })}
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', boxSizing: 'border-box' }}
              placeholder="Checker name"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8' }}>Approved By</label>
            <input
              data-testid="report-approved-by"
              type="text"
              value={reportReviewState.approvedBy}
              onChange={(e) => updateReportReviewState({ approvedBy: e.target.value })}
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', boxSizing: 'border-box' }}
              placeholder="Approver name"
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8' }}>Issue Status</label>
            <select
              data-testid="report-issue-status"
              value={reportReviewState.issueStatus}
              onChange={(e) => updateReportReviewState({ issueStatus: e.target.value })}
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', boxSizing: 'border-box' }}
            >
              <option value="DRAFT">DRAFT</option>
              <option value="CHECKED">CHECKED</option>
              <option value="ISSUED">ISSUED</option>
              <option value="VOID">VOID</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8' }}>Issue Type</label>
            <select
              data-testid="report-issue-type"
              value={reportReviewState.issueType}
              onChange={(e) => updateReportReviewState({ issueType: e.target.value })}
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', boxSizing: 'border-box' }}
            >
              <option value="SCREENING_ISSUE">SCREENING_ISSUE</option>
              <option value="FINAL_ISSUE">FINAL_ISSUE</option>
            </select>
          </div>
          <div></div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: '#94a3b8' }}>Checker Notes</label>
          <textarea
            data-testid="report-checker-notes"
            value={reportReviewState.checkerNotes}
            onChange={(e) => updateReportReviewState({ checkerNotes: e.target.value })}
            style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', boxSizing: 'border-box', minHeight: 60, fontFamily: 'monospace', fontSize: 12 }}
            placeholder="Notes for review"
          />
        </div>

        {/* Eligibility Status */}
        <div data-testid="report-issue-eligibility" style={{ background: '#0f172a', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 12 }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ color: '#94a3b8' }}>Can Save Draft: </span>
            <span style={{ color: eligibility.canSaveDraft ? '#86efac' : '#f87171' }}>{eligibility.canSaveDraft ? 'YES' : 'NO'}</span>
          </div>
          <div style={{ marginBottom: 8 }}>
            <span style={{ color: '#94a3b8' }}>Can Check: </span>
            <span style={{ color: eligibility.canCheck ? '#86efac' : '#f87171' }}>{eligibility.canCheck ? 'YES' : 'NO'}</span>
          </div>
          <div style={{ marginBottom: 8 }}>
            <span style={{ color: '#94a3b8' }}>Can Issue: </span>
            <span style={{ color: eligibility.canIssue ? '#86efac' : '#f87171' }}>{eligibility.canIssue ? 'YES' : 'NO'}</span>
          </div>
          {eligibility.resultStatus && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: '#94a3b8' }}>Result Status: </span>
              <span style={{ color: '#e2e8f0' }}>{eligibility.resultStatus}</span>
            </div>
          )}
          {eligibility.dataStatus && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: '#94a3b8' }}>Data Status: </span>
              <span style={{ color: '#e2e8f0' }}>{eligibility.dataStatus}</span>
            </div>
          )}
          {eligibility.engineeringLevel && (
            <div>
              <span style={{ color: '#94a3b8' }}>Engineering Level: </span>
              <span style={{ color: '#e2e8f0' }}>{eligibility.engineeringLevel}</span>
            </div>
          )}
        </div>

        {/* Blockers and Warnings */}
        {eligibility.blockers.length > 0 && (
          <div data-testid="report-issue-blockers" style={{ background: '#7f1d1d', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 12 }}>
            <div style={{ color: '#fca5a5', fontWeight: 'bold', marginBottom: 8 }}>Blockers:</div>
            {eligibility.blockers.map((blocker, idx) => (
              <div key={idx} style={{ color: '#fca5a5', marginBottom: 4 }}>
                {blocker.code}: {blocker.message}
              </div>
            ))}
          </div>
        )}

        {eligibility.warnings.length > 0 && (
          <div data-testid="report-issue-warnings" style={{ background: '#78350f', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 12 }}>
            <div style={{ color: '#fcd34d', fontWeight: 'bold', marginBottom: 8 }}>Warnings:</div>
            {eligibility.warnings.map((warning, idx) => (
              <div key={idx} style={{ color: '#fcd34d', marginBottom: 4 }}>
                {warning.code}: {warning.message}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            data-testid="report-save-revision"
            onClick={() => createRevision()}
            disabled={!eligibility.canSaveDraft}
            style={{
              padding: '8px 16px',
              borderRadius: 4,
              border: 'none',
              background: eligibility.canSaveDraft ? '#3b82f6' : '#4b5563',
              color: '#fff',
              cursor: eligibility.canSaveDraft ? 'pointer' : 'not-allowed',
              fontSize: 12,
              fontWeight: 'bold',
            }}
          >
            Save Revision
          </button>
          <button
            data-testid="report-export-markdown"
            onClick={() => handleExport(exportBundle.markdown)}
            style={{ padding: '8px 16px', borderRadius: 4, border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}
          >
            Export Markdown
          </button>
          <button
            data-testid="report-export-json"
            onClick={() => handleExport(exportBundle.json)}
            style={{ padding: '8px 16px', borderRadius: 4, border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}
          >
            Export JSON
          </button>
          <button
            data-testid="report-export-html"
            onClick={() => handleExport(exportBundle.html)}
            style={{ padding: '8px 16px', borderRadius: 4, border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}
          >
            Export HTML
          </button>
        </div>
      </div>

      {/* Report History */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Report History</h3>
        {reportHistory.length === 0 ? (
          <div data-testid="report-history-empty" style={{ color: '#cbd5e1', fontSize: 12 }}>
            No revisions saved yet.
          </div>
        ) : (
          <div data-testid="report-history" style={{ background: '#0f172a', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#1a1a2e', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: 8, textAlign: 'left', color: '#94a3b8' }}>Revision</th>
                  <th style={{ padding: 8, textAlign: 'left', color: '#94a3b8' }}>Status</th>
                  <th style={{ padding: 8, textAlign: 'left', color: '#94a3b8' }}>Method</th>
                  <th style={{ padding: 8, textAlign: 'left', color: '#94a3b8' }}>Prepared</th>
                  <th style={{ padding: 8, textAlign: 'left', color: '#94a3b8' }}>Checked</th>
                  <th style={{ padding: 8, textAlign: 'left', color: '#94a3b8' }}>Approved</th>
                </tr>
              </thead>
              <tbody>
                {reportHistory.map((rev, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: 8, color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11 }}>{rev.revisionId}</td>
                    <td style={{ padding: 8, color: '#e2e8f0' }}>{rev.issueStatus}</td>
                    <td style={{ padding: 8, color: '#e2e8f0' }}>{rev.methodId}</td>
                    <td style={{ padding: 8, color: '#cbd5e1', fontSize: 11 }}>{rev.reviewerChecker?.preparedBy || '-'}</td>
                    <td style={{ padding: 8, color: '#cbd5e1', fontSize: 11 }}>{rev.reviewerChecker?.checkedBy || '-'}</td>
                    <td style={{ padding: 8, color: '#cbd5e1', fontSize: 11 }}>{rev.reviewerChecker?.approvedBy || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Report Preview */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Calculation Sheet</h3>
        <pre data-testid="report-preview" style={{ background: '#020617', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 12, padding: 16, whiteSpace: 'pre-wrap' }}>
          {markdown}
        </pre>
      </div>
    </div>
  );
};
