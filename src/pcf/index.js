export * from './pcfParser.js';
export * from './pcfSerializer.js';
export * from './pcfReader.js';

import { parsePcfWithDiagnostics } from './pcfParser.js';
import { pcfToCanonicalGeometry } from '../core/geometry/adapters/pcfToCanonicalGeometry.js';
import { canonicalToPcfComponents } from '../core/geometry/adapters/canonicalToPcfComponents.js';
import { validateCanonicalGeometry } from '../core/geometry/validateCanonicalGeometry.js';
import { serializePcf } from './pcfSerializer.js';

export const importPcf = (rawText) => {
  const { components, diagnostics: parseDiagnostics, summary: parseSummary } = parsePcfWithDiagnostics(rawText);
  let geometry = pcfToCanonicalGeometry(components, { source: 'pcf', unit: 'mm' });

  const validation = validateCanonicalGeometry(geometry);
  geometry.diagnostics = [...(geometry.diagnostics || []), ...validation.diagnostics];
  geometry.valid = validation.ok;

  const lossReport = [];
  const unsupportedComponents = components.filter(c => !c.points?.length && !c.centrePoint && !c.coOrds);

  if (unsupportedComponents.length > 0) {
      lossReport.push({
          type: 'UNSUPPORTED_COMPONENT',
          count: unsupportedComponents.length,
          components: unsupportedComponents.map(c => c.type)
      });
  }

  const missingRating = components.filter(c => !c.attributes?.['ITEM-CODE'] && !c.attributes?.MATERIAL);
  if (missingRating.length > 0) {
      lossReport.push({
          type: 'MISSING_PROPERTY',
          property: 'MATERIAL / ITEM-CODE',
          count: missingRating.length
      });
  }

  const importScore = components.length > 0 ? ((components.length - unsupportedComponents.length) / components.length) * 100 : 0;

  const typeCounts = components.reduce((acc, c) => {
      acc[c.type.toLowerCase() + 's'] = (acc[c.type.toLowerCase() + 's'] || 0) + 1;
      return acc;
  }, {});

  const imported = {
      nodes: geometry.nodes?.length || 0,
      segments: geometry.segments?.length || 0,
      ...typeCounts
  };

  const warnings = [...parseDiagnostics.map(d => ({ code: d.code, message: d.message })), ...geometry.diagnostics.map(d => ({ code: d.code, message: d.message }))];

  return {
    geometry,
    diagnostics: {
        imported,
        warnings,
        lossReport,
        importConfidenceScore: importScore
    }
  };
};

export const exportPcf = (geometry) => {
    const components = canonicalToPcfComponents(geometry);
    const pcfText = serializePcf(components);
    return pcfText;
}
