export const PCFX_FILE_UTILS_SCHEMA_VERSION = 'pcfx-file-utils-v1';

export function serializePCFX(pcfx) {
  return JSON.stringify({
    schemaVersion: pcfx.schemaVersion,
    pcfxVersion: pcfx.pcfxVersion,
    ...pcfx,
  }, null, 2);
}

export function parsePCFXText(text) {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Object.keys(parsed).length === 0) {
      return { ok: false, pcfx: null, diagnostic: { code: 'PCFX_PARSE_EMPTY', message: 'Parsed PCFX is empty or invalid.' } };
    }
    return { ok: true, pcfx: parsed, diagnostic: null };
  } catch (e) {
    return { ok: false, pcfx: null, diagnostic: { code: 'PCFX_PARSE_FAILED', message: `Failed to parse PCFX: ${e.message}` } };
  }
}

export function downloadTextFile(filename, content, mimeType = 'text/plain') {
  if (typeof document === 'undefined') return { skipped: true };
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { skipped: false };
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = e => reject(e);
    reader.readAsText(file);
  });
}

export function makePCFXFilename(prefix = 'sketch') {
  const safe = String(prefix).replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 40);
  return `${safe}.pcfx.json`;
}
