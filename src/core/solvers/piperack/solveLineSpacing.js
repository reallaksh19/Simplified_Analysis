export function summarizeLineSpacing(layoutResult = {}) {
  const layout = Array.isArray(layoutResult.layout) ? layoutResult.layout : [];
  return layout
    .filter((item) => !item.isFutureSlot)
    .map((item) => ({
      id: item.id,
      tier: item.tier,
      x_mm: item.x_mm,
      y_mm: item.y_mm,
      spacingLog: item.spacing_log || '',
      loopOrder: item.loopOrder || 0,
    }));
}
