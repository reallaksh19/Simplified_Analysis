import { deepFreeze, stringValue } from '../shared-piping-model/index.js';

export function normalizeParserDiagnostics(source) {
  return (source || []).map((row) => {
    const code = String(row?.code || 'PCF_PARSER_DIAGNOSTIC');
    const blocking = ['PCF_COORD_INCOMPLETE', 'PCF_COORD_INVALID_NUMBER', 'PCF_COMPONENTS_WITHOUT_GEOMETRY'].includes(code);
    const severity = blocking ? 'ERROR' : String(row?.severity || '').toLowerCase() === 'warn' ? 'WARNING' : 'INFO';
    return pcfDiagnostic(severity, code, String(row?.message || 'PCF parser diagnostic.'), row?.data || {});
  });
}

export function pcfDiagnostic(severity, code, message, details = {}) {
  const lineNumber = Number.isInteger(details?.lineNumber) ? details.lineNumber : null;
  const componentId = stringValue(details?.componentId) || null;
  return deepFreeze({ severity, code, message, lineNumber, componentId, details: deepFreeze({ ...details }) });
}

export function canonicalizePcfDiagnostics(rows) {
  const byKey = new Map();
  rows.forEach((row) => byKey.set(`${row.severity}|${row.code}|${row.componentId || ''}|${row.lineNumber || ''}|${row.message}`, row));
  return deepFreeze([...byKey.values()].sort((a, b) => diagnosticKey(a).localeCompare(diagnosticKey(b))));
}

function diagnosticKey(row) {
  return `${row.severity}|${row.code}|${row.componentId || ''}|${row.lineNumber || ''}|${row.message}`;
}
