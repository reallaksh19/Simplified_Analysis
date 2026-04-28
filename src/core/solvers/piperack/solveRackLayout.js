import { estimateFlangeRadiusIn, getRackMaterialProps, getRackPipeProps, numeric } from './dbUtils.js';

const createFutureSlot = (tier, gapWidthMm) => ({
  id: `FUTURE_${tier}`,
  isFutureSlot: true,
  gapWidth_mm: Math.round(gapWidthMm / 50) * 50,
  tier: Number(tier),
});

const getSmartTier = (line, numTiers) => {
  const service = String(line.service || '');
  let tier = 1;
  if (service.includes('Flare')) tier = 3;
  else if (service.includes('Utility') || service.includes('Gas')) tier = 2;
  return Math.max(1, Math.min(numTiers, Number(line.tier ?? tier) || tier));
};

export function solveRackLayout(lines = [], globalSettings = {}, structSettings = {}) {
  const runLengthFt = numeric(globalSettings.anchorDistanceFt, 200);
  const numTiers = Math.max(1, Math.min(8, parseInt(structSettings.numTiers || 3, 10)));
  const futureSpacePct = Math.max(0, numeric(structSettings.futureSpacePct, 20));
  const warnings = [];
  const logs = ['[SOLVER] Initializing canonical pipe rack layout solver.'];

  const processed = (Array.isArray(lines) ? lines : []).map((line, inputIndex) => {
    const material = getRackMaterialProps(line.material, line.tOperate);
    const pipe = getRackPipeProps(line.sizeNps, line.schedule);
    const deltaIn = material.expansionInPerFt * runLengthFt;
    const loopOrder = line.loop_order !== undefined && line.loop_order !== null ? numeric(line.loop_order, 0) : numeric(pipe.I, 0) * deltaIn;

    material.warnings.forEach((message) => warnings.push({ lineId: line.id, severity: 'warn', code: 'RACK_MATERIAL_FALLBACK', message }));
    pipe.warnings.forEach((message) => warnings.push({ lineId: line.id, severity: 'warn', code: 'RACK_PIPE_FALLBACK', message }));

    return {
      ...line,
      inputIndex,
      delta_in: deltaIn,
      I: numeric(pipe.I, 1),
      loopOrder,
      tier: getSmartTier(line, numTiers),
      OD_in: numeric(pipe.OD, numeric(line.sizeNps, 1)),
      flgRad_in: line.hasFlange !== false ? estimateFlangeRadiusIn(line.sizeNps, line.flange) : 0,
      pipeFallback: Boolean(pipe.fallback),
    };
  });

  const tiers = {};
  for (let t = 1; t <= numTiers; t += 1) tiers[t] = [];
  processed.forEach((line) => tiers[line.tier].push(line));

  Object.keys(tiers).forEach((tier) => {
    const tierLines = tiers[tier];
    const userSorted = tierLines.filter((line) => line.userOrderIndex !== null && line.userOrderIndex !== undefined).sort((a, b) => a.userOrderIndex - b.userOrderIndex);
    const autoSorted = tierLines.filter((line) => line.userOrderIndex === null || line.userOrderIndex === undefined).sort((a, b) => b.loopOrder - a.loopOrder || a.inputIndex - b.inputIndex);
    const left = [];
    const right = [];
    autoSorted.forEach((line, idx) => (idx % 2 === 0 ? left.push(line) : right.unshift(line)));
    const combined = [...left, ...userSorted, ...right];
    combined.forEach((line, idx) => { line.userOrderIndex = idx; });

    if (combined.length > 0 && futureSpacePct > 0) {
      let occupied = numeric(structSettings.beamWidth_mm, 300) + numeric(structSettings.gussetGap_mm, 100) * 2;
      combined.forEach((line) => {
        occupied += (numeric(line.OD_in, 0) * 25.4) + numeric(line.insulationThk, 0) * 2 + numeric(line.flgRad_in, 0) * 25.4 * 2 + 75;
      });
      combined.splice(Math.floor(combined.length / 2), 0, createFutureSlot(tier, occupied * (futureSpacePct / 100)));
    }
    tiers[tier] = combined;
  });

  const layout = [];
  Object.keys(tiers).forEach((tier) => {
    const tierGroup = tiers[tier];
    let currentX = 0;
    tierGroup.forEach((line, idx) => {
      const y_mm = (structSettings.tierElevations_mm && structSettings.tierElevations_mm[tier]) || (4600 + (Number(tier) - 1) * 3000);
      if (line.isFutureSlot) {
        currentX += numeric(line.gapWidth_mm, 0);
        layout.push({ ...line, x_mm: currentX - numeric(line.gapWidth_mm, 0) / 2, y_mm });
        return;
      }

      if (line.spacing_override !== null && line.spacing_override !== undefined) {
        layout.push({ ...line, x_mm: numeric(line.spacing_override, 0), y_mm, manualPosition: true });
        return;
      }

      const insMm = numeric(line.insulationThk, 0);
      const odMm = numeric(line.OD_in, 0) * 25.4;
      const flgRadMm = numeric(line.flgRad_in, 0) * 25.4;
      if (idx === 0) {
        currentX += insMm + flgRadMm;
        line.spacing_log = 'Edge start.';
      } else {
        let prevIdx = idx - 1;
        while (prevIdx >= 0 && tierGroup[prevIdx].isFutureSlot) prevIdx -= 1;
        const prev = prevIdx >= 0 ? tierGroup[prevIdx] : null;
        if (prev) {
          const prevIns = numeric(prev.insulationThk, 0);
          const prevOd = numeric(prev.OD_in, 0) * 25.4;
          const prevFlgRad = numeric(prev.flgRad_in, 0) * 25.4;
          const physicalGap = prevOd / 2 + prevIns + odMm / 2 + insMm;
          const flangeAllowance = (prev.stagger && line.stagger) ? Math.max(prevFlgRad, flgRadMm) : (prevFlgRad + flgRadMm);
          // Bowing approximation based on simplified Caesar II / Fluor expansion estimates
          const bowing = Math.max(numeric(prev.delta_in, 0), numeric(line.delta_in, 0)) * 25.4 * numeric(structSettings.bowingMultiplier, 0.15);

          const MIN_PIPE_GUIDE_CLEARANCE_MM = 75;  // min clear gap between guided pipes, per Fluor piperack std
          const GUIDE_BRACKET_ALLOWANCE_MM  = 25;  // bracket/clip thickness allowance
          const standardGap = Math.max(MIN_PIPE_GUIDE_CLEARANCE_MM, numeric(prev.guide_mm, 50) / 2 + numeric(line.guide_mm, 50) / 2) + GUIDE_BRACKET_ALLOWANCE_MM;

          const spacing = physicalGap + flangeAllowance + bowing + standardGap;
          currentX += tierGroup[idx - 1].isFutureSlot ? spacing / 2 : spacing;
          line.spacing_log = `S_pipe = PhysGap(${physicalGap.toFixed(0)}) + FlgAllow(${flangeAllowance.toFixed(0)}) + Bowing(${bowing.toFixed(0)}) + StdGap(${standardGap.toFixed(0)}) = ${spacing.toFixed(0)}mm`;
        } else {
          currentX += insMm + flgRadMm;
          line.spacing_log = 'Edge restart after future slot.';
        }
      }
      layout.push({ ...line, x_mm: currentX, y_mm });
    });
  });

  Object.keys(tiers).forEach((tier) => {
    const tierLayout = layout.filter((item) => item.tier === Number(tier) && !item.manualPosition);
    if (!tierLayout.length) return;
    const xs = tierLayout.map((item) => numeric(item.x_mm, 0));
    const center = (Math.min(...xs) + Math.max(...xs)) / 2;
    tierLayout.forEach((item) => { item.x_mm -= center; });
  });

  let maxOccupiedWidth = 1000;
  Object.keys(tiers).forEach((tier) => {
    const tierLayout = layout.filter((item) => item.tier === Number(tier));
    if (!tierLayout.length) return;
    const minX = Math.min(...tierLayout.map((item) => item.isFutureSlot ? item.x_mm - item.gapWidth_mm / 2 : item.x_mm - (numeric(item.OD_in, 0) * 25.4 / 2) - numeric(item.insulationThk, 0)));
    const maxX = Math.max(...tierLayout.map((item) => item.isFutureSlot ? item.x_mm + item.gapWidth_mm / 2 : item.x_mm + (numeric(item.OD_in, 0) * 25.4 / 2) + numeric(item.insulationThk, 0)));
    if (Number.isFinite(maxX - minX)) maxOccupiedWidth = Math.max(maxOccupiedWidth, maxX - minX);
  });

  const width_mm = maxOccupiedWidth + numeric(structSettings.gussetGap_mm, 100) * 2;
  let cantilever_mm = width_mm;
  layout.forEach((item) => {
    if (item.manualPosition) {
      const requiredHalf = Math.abs(numeric(item.x_mm, 0)) + numeric(item.OD_in, 0) * 25.4 / 2 + numeric(item.insulationThk, 0) + numeric(structSettings.gussetGap_mm, 100);
      cantilever_mm = Math.max(cantilever_mm, requiredHalf * 2);
    }
  });

  const realLineCount = layout.filter((item) => !item.isFutureSlot).length;
  logs.push(`[MATH] Rack width calculation completed. Berthed ${realLineCount} lines over ${numTiers} tier(s).`);
  layout.forEach((item) => {
    if (item.isFutureSlot) logs.push(`[SPACE] Future slot ${item.id}: ${item.gapWidth_mm}mm reserved on tier ${item.tier}.`);
    else {
      logs.push(`[SYS] ${item.id} Thermal Expansion: ΔL=${numeric(item.delta_in, 0).toFixed(2)} in; loopOrder=${numeric(item.loopOrder, 0).toFixed(2)}.`);
      if (item.spacing_log) logs.push(`[MATH] ${item.id} Spacing Check: ${item.spacing_log}`);
    }
  });

  return {
    schemaVersion: 'piperack-layout-v1',
    layout,
    width_mm,
    cantilever_mm,
    tiers,
    warnings,
    logs,
    summary: {
      lineCount: realLineCount,
      tierCount: numTiers,
      futureSlotCount: layout.filter((item) => item.isFutureSlot).length,
      warningCount: warnings.length,
    },
  };
}
