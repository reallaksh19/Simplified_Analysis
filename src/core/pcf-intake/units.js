import { deepFreeze } from '../shared-piping-model/index.js';
import { pcfDiagnostic } from './diagnostics.js';

const UNIT_ALIASES = new Map([
  ['MM', { unit: 'mm', scaleToMm: 1 }], ['MILLIMETRE', { unit: 'mm', scaleToMm: 1 }],
  ['MILLIMETER', { unit: 'mm', scaleToMm: 1 }], ['M', { unit: 'm', scaleToMm: 1000 }],
  ['METRE', { unit: 'm', scaleToMm: 1000 }], ['METER', { unit: 'm', scaleToMm: 1000 }],
  ['IN', { unit: 'in', scaleToMm: 25.4 }], ['INCH', { unit: 'in', scaleToMm: 25.4 }],
  ['INCHES', { unit: 'in', scaleToMm: 25.4 }], ['FT', { unit: 'ft', scaleToMm: 304.8 }],
  ['FOOT', { unit: 'ft', scaleToMm: 304.8 }], ['FEET', { unit: 'ft', scaleToMm: 304.8 }],
]);

export function readPcfUnitEvidence(sourceText) {
  const declarations = [];
  sourceText.split('\n').forEach((sourceLine, index) => {
    const match = sourceLine.trim().match(/^UNITS-(CO-ORDS|BORE)\s+(.+)$/i);
    if (!match) return;
    const kind = match[1].toUpperCase();
    const token = match[2].trim().split(/\s+/)[0].toUpperCase();
    const resolved = UNIT_ALIASES.get(token) || null;
    declarations.push(deepFreeze({ kind, token, lineNumber: index + 1, unit: resolved?.unit || null, scaleToMm: resolved?.scaleToMm || null }));
  });
  return deepFreeze({
    declarations,
    coordinate: declarations.find((row) => row.kind === 'CO-ORDS') || null,
    bore: declarations.find((row) => row.kind === 'BORE') || null,
  });
}

export function addPcfUnitDiagnostics(units, parsedComponents, diagnostics) {
  if (!units.coordinate) diagnostics.push(pcfDiagnostic('ERROR', 'PCF_COORDINATE_UNITS_MISSING', 'UNITS-CO-ORDS must be declared before adoption.'));
  else if (!units.coordinate.unit) diagnostics.push(pcfDiagnostic('ERROR', 'PCF_COORDINATE_UNITS_UNSUPPORTED', `Unsupported coordinate unit ${units.coordinate.token}.`, { lineNumber: units.coordinate.lineNumber }));
  const hasBore = parsedComponents.some((component) => Number(component?.bore) > 0 || (component?.points || []).some((point) => Number(point?.bore) > 0));
  if (hasBore && !units.bore) diagnostics.push(pcfDiagnostic('ERROR', 'PCF_BORE_UNITS_MISSING', 'UNITS-BORE must be declared when bore values are present.'));
  else if (units.bore && !units.bore.unit) diagnostics.push(pcfDiagnostic('ERROR', 'PCF_BORE_UNITS_UNSUPPORTED', `Unsupported bore unit ${units.bore.token}.`, { lineNumber: units.bore.lineNumber }));
  if (units.coordinate?.unit && units.bore?.unit && units.coordinate.unit !== units.bore.unit) diagnostics.push(pcfDiagnostic('ERROR', 'PCF_UNITS_INCONSISTENT', `Coordinate unit ${units.coordinate.unit} and bore unit ${units.bore.unit} are inconsistent.`));
  ['CO-ORDS', 'BORE'].filter((kind) => units.declarations.filter((row) => row.kind === kind).length > 1)
    .forEach((kind) => diagnostics.push(pcfDiagnostic('ERROR', 'PCF_UNIT_DECLARATION_DUPLICATE', `UNITS-${kind} is declared more than once.`)));
}
