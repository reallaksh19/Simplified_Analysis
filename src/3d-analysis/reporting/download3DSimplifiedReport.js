export function download3DSimplifiedReportText({
  filename,
  content,
  mimeType = 'text/plain;charset=utf-8',
} = {}) {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    return {
      ok: false,
      reason: 'DOWNLOAD_NOT_AVAILABLE_OUTSIDE_BROWSER',
    };
  }

  const safeFilename = String(filename || '3d-simplified-report.txt')
    .trim()
    .replace(/[<>:"/\\|?*]+/g, '-');

  const blob = new Blob([String(content ?? '')], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = safeFilename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  return {
    ok: true,
    filename: safeFilename,
  };
}

export function make3DSimplifiedReportFilename({
  report,
  extension,
} = {}) {
  const reportId = String(report?.reportId || '3d-simplified-report')
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '-');

  const ext = String(extension || 'txt')
    .trim()
    .replace(/^\./, '')
    .replace(/[^A-Za-z0-9]+/g, '');

  return `${reportId}.${ext || 'txt'}`;
}