export function exportJsonSnapshot(payload, fileName = 'calculation-snapshot.json') {
  const text = JSON.stringify(payload || {}, null, 2);
  if (typeof document === 'undefined') return text;
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  return text;
}
