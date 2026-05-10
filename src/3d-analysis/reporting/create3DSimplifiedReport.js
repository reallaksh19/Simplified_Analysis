export const REPORT_3D_SIMPLIFIED_SCHEMA_VERSION = '3d-simplified-report-v1';

function text(value, fallback = '') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function round(value, digits = 3) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const factor = 10 ** digits;
  return Math.round((parsed + Number.EPSILON) * factor) / factor;
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== '' && value != null))];
}

function collectMasterDbProvenance(model = {}) {
  const rows = [];

  for (const segment of model.segments || []) {
    const provenance = segment.provenance || {};
    const master = provenance.masterDbProvenance || null;

    if (!provenance.masterDbRowId && !master?.rowId) continue;

    rows.push({
      segmentId: segment.id,
      rowId: text(provenance.masterDbRowId || master?.rowId),
      dbVersion: text(provenance.masterDbVersion),
      displayName: text(master?.displayName),
      source: text(master?.source || provenance.propertySource),
      sourceRevision: text(master?.sourceRevision),
      verified: Boolean(master?.verified),
      componentWeight_kg: round(segment.component?.componentWeight_kg, 6),
      componentLength_mm: round(segment.component?.componentLength_mm, 3),
    });
  }

  return rows;
}

function collectFormulaIds(supportLoads = {}) {
  const ids = [];

  for (const formula of supportLoads.formulas || []) {
    ids.push(formula.id);
  }

  for (const segmentLoad of supportLoads.segmentLoads || []) {
    for (const id of segmentLoad.formulaIds || []) {
      ids.push(id);
    }
  }

  return unique(ids);
}

function collectInputSummary(model = {}, propertySummary = {}, supportLoads = {}) {
  const segments = model.segments || [];
  const supports = model.supports || [];

  return {
    units: model.units || {},
    nodeCount: Object.keys(model.nodes || {}).length,
    segmentCount: segments.length,
    supportCount: supports.length,
    pipeSegments: propertySummary.pipeSegments ?? 0,
    componentSegments: propertySummary.componentSegments ?? 0,
    materials: propertySummary.materials || [],
    schedules: propertySummary.schedules || [],
    ratings: propertySummary.ratings || [],
    totalWeight_N: supportLoads.summary?.totalSegmentWeight_N ?? 0,
    totalReaction_N: supportLoads.summary?.totalReaction_N ?? 0,
    imbalance_N: supportLoads.summary?.imbalance_N ?? 0,
  };
}

export function create3DSimplifiedReport({
  model,
  validation,
  summary,
  propertySummary,
  supportLoads,
  source = '3d-simplified-panel',
} = {}) {
  const diagnostics = [
    ...(validation?.diagnostics || []),
    ...(supportLoads?.diagnostics || []),
  ];

  const masterDbProvenance = collectMasterDbProvenance(model);
  const formulaIds = collectFormulaIds(supportLoads);

  return {
    schemaVersion: REPORT_3D_SIMPLIFIED_SCHEMA_VERSION,
    reportId: '3DSC-SLICE-G-REPORT',
    title: '3D Simplified Calculation Report',
    source,
    status: validation?.status || 'UNKNOWN',

    methodIds: unique([
      supportLoads?.methodId,
    ]),

    formulaIds,

    inputSummary: collectInputSummary(model, propertySummary, supportLoads),

    supportLoadSummary: supportLoads?.summary || {},

    supportLoadTable: (supportLoads?.supportReactions || []).map((support) => ({
      supportId: support.supportId,
      nodeId: support.nodeId,
      type: support.type,
      reaction_N: support.reaction_N,
      reaction_kgf: support.reaction_kgf,
      assignedSegments: support.assignedSegments || [],
    })),

    segmentLoadTable: (supportLoads?.segmentLoads || []).map((segment) => ({
      segmentId: segment.segmentId,
      type: segment.type,
      length_mm: segment.length_mm,
      metalMass_kg: segment.metalMass_kg,
      fluidMass_kg: segment.fluidMass_kg,
      insulationMass_kg: segment.insulationMass_kg,
      componentMass_kg: segment.componentMass_kg,
      totalMass_kg: segment.totalMass_kg,
      totalWeight_N: segment.totalWeight_N,
      supportNodeIds: segment.supportNodeIds || [],
      formulaIds: segment.formulaIds || [],
    })),

    assumptions: supportLoads?.assumptions || [],

    formulas: supportLoads?.formulas || [],

    diagnostics,

    masterDbProvenance,
  };
}

export function create3DSimplifiedReportMarkdown(report = {}) {
  const lines = [];

  lines.push(`# ${report.title || '3D Simplified Calculation Report'}`);
  lines.push('');
  lines.push(`Report ID: ${report.reportId || 'UNSPECIFIED'}`);
  lines.push(`Schema: ${report.schemaVersion || 'UNSPECIFIED'}`);
  lines.push(`Status: ${report.status || 'UNKNOWN'}`);
  lines.push(`Method IDs: ${(report.methodIds || []).join(', ') || 'UNSPECIFIED'}`);
  lines.push('');

  lines.push('## Input Summary');
  lines.push('');
  lines.push(`Nodes: ${report.inputSummary?.nodeCount ?? 0}`);
  lines.push(`Segments: ${report.inputSummary?.segmentCount ?? 0}`);
  lines.push(`Supports: ${report.inputSummary?.supportCount ?? 0}`);
  lines.push(`Materials: ${(report.inputSummary?.materials || []).join(', ') || 'UNSPECIFIED'}`);
  lines.push(`Schedules: ${(report.inputSummary?.schedules || []).join(', ') || 'UNSPECIFIED'}`);
  lines.push(`Ratings: ${(report.inputSummary?.ratings || []).join(', ') || 'UNSPECIFIED'}`);
  lines.push('');

  lines.push('## Support Load Summary');
  lines.push('');
  lines.push(`Total Weight N: ${report.supportLoadSummary?.totalSegmentWeight_N ?? 0}`);
  lines.push(`Total Reaction N: ${report.supportLoadSummary?.totalReaction_N ?? 0}`);
  lines.push(`Imbalance N: ${report.supportLoadSummary?.imbalance_N ?? 0}`);
  lines.push('');

  lines.push('## Support Load Table');
  lines.push('');
  lines.push('| Support | Node | Type | Reaction N | Reaction kgf | Assigned Segments |');
  lines.push('|---|---|---|---:|---:|---|');
  for (const support of report.supportLoadTable || []) {
    lines.push(
      `| ${support.supportId} | ${support.nodeId} | ${support.type} | ${support.reaction_N} | ${support.reaction_kgf} | ${(support.assignedSegments || []).join(', ')} |`
    );
  }
  lines.push('');

  lines.push('## Segment Load Table');
  lines.push('');
  lines.push('| Segment | Type | Metal kg | Fluid kg | Insulation kg | Component kg | Weight N |');
  lines.push('|---|---|---:|---:|---:|---:|---:|');
  for (const segment of report.segmentLoadTable || []) {
    lines.push(
      `| ${segment.segmentId} | ${segment.type} | ${segment.metalMass_kg} | ${segment.fluidMass_kg} | ${segment.insulationMass_kg} | ${segment.componentMass_kg} | ${segment.totalWeight_N} |`
    );
  }
  lines.push('');

  lines.push('## Formula IDs');
  lines.push('');
  for (const id of report.formulaIds || []) {
    lines.push(`- ${id}`);
  }
  lines.push('');

  lines.push('## Formula Expressions');
  lines.push('');
  for (const formula of report.formulas || []) {
    lines.push(`- ${formula.id}: ${formula.expression}`);
  }
  lines.push('');

  lines.push('## Assumptions');
  lines.push('');
  for (const assumption of report.assumptions || []) {
    lines.push(`- ${assumption}`);
  }
  lines.push('');

  lines.push('## Master DB Provenance');
  lines.push('');
  if ((report.masterDbProvenance || []).length === 0) {
    lines.push('No Master DB rows used.');
  } else {
    lines.push('| Segment | Row ID | Source | Revision | Verified | Length mm | Weight kg |');
    lines.push('|---|---|---|---|---:|---:|---:|');
    for (const row of report.masterDbProvenance || []) {
      lines.push(
        `| ${row.segmentId} | ${row.rowId} | ${row.source} | ${row.sourceRevision} | ${row.verified} | ${row.componentLength_mm} | ${row.componentWeight_kg} |`
      );
    }
  }
  lines.push('');

  lines.push('## Diagnostics');
  lines.push('');
  if ((report.diagnostics || []).length === 0) {
    lines.push('No diagnostics.');
  } else {
    for (const item of report.diagnostics || []) {
      lines.push(`- ${item.severity || 'info'} / ${item.code || 'NO_CODE'}: ${item.message || ''}`);
    }
  }

  return lines.join('\n');
}