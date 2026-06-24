const escapeCsv = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function rowsToCsv(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return '';
  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row || {}).forEach((key) => set.add(key));
    return set;
  }, new Set()));
  return [headers.join(','), ...rows.map((row) => headers.map((key) => escapeCsv(row?.[key])).join(','))].join('\n');
}

export function exportCsvTables(rows = [], fileName = 'calculation-table.csv') {
  const text = rowsToCsv(rows);
  if (typeof document === 'undefined') return text;
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  return text;
}
