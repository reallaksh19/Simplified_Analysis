import { canonicalPrettyStringify, deepFreeze, semanticHash } from '../shared-piping-model/index.js';
import { PCF_REVIEW_EXPORT_SCHEMA } from './constants.js';

export function createPcfReviewExport(reviewModel, format = 'json') {
  if (!reviewModel || reviewModel.schema !== 'pcf-review-model/v1') throw new TypeError('A PCF review model is required for export.');
  const normalized = String(format).toLowerCase();
  if (!['json', 'csv'].includes(normalized)) throw new TypeError(`Unsupported PCF review export format: ${format}.`);
  const content = normalized === 'json' ? jsonContent(reviewModel) : csvContent(reviewModel);
  const baseName = safeName(reviewModel.sourceName).replace(/\.pcf$/i, '') || 'pcf-review';
  const suffix = reviewModel.semanticHash.split(':').at(-1).slice(0, 12);
  const base = {
    schema: PCF_REVIEW_EXPORT_SCHEMA,
    format: normalized,
    filename: `${baseName}-${suffix}.${normalized}`,
    mediaType: normalized === 'json' ? 'application/json;charset=utf-8' : 'text/csv;charset=utf-8',
    byteLength: new TextEncoder().encode(content).length,
    content,
    reviewSemanticHash: reviewModel.semanticHash,
  };
  return deepFreeze({ ...base, semanticHash: semanticHash(base) });
}

function jsonContent(model) {
  return `${canonicalPrettyStringify({
    schema: model.schema,
    semanticHash: model.semanticHash,
    sourceName: model.sourceName,
    sourceTextHash: model.sourceTextHash,
    units: model.units,
    summary: model.summary,
    canonicalGeometrySummary: model.canonicalGeometrySummary,
    adoption: model.adoption,
    diagnostics: model.diagnostics,
    components: model.components,
  })}\n`;
}

function csvContent(model) {
  const rows = [['source_index','component_id','type','adoption_mode','line_start','line_end','point_count','branch_point_count','attribute_count']];
  model.components.forEach((row) => rows.push([
    row.sourceIndex,
    row.componentId,
    row.type,
    row.adoptionMode,
    row.sourceLineStart ?? '',
    row.sourceLineEnd ?? '',
    row.pointCount,
    row.branchPointCount,
    Object.keys(row.attributes).length,
  ]));
  return `${rows.map((row) => row.map(csvCell).join(',')).join('\n')}\n`;
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function safeName(value) {
  return String(value || '').replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '');
}
