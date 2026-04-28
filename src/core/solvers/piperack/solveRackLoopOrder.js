import { getRackMaterialProps, getRackPipeProps, numeric } from './dbUtils.js';

export function solveRackLoopOrder(lines = [], globalSettings = {}, methodology = 'FLUOR', globalInputs = {}) {
  const anchorDistanceFt = numeric(globalSettings.anchorDistanceFt, 200);
  const expansionLengthFt = anchorDistanceFt / 2;
  const allowableStressPsi = Math.max(numeric(globalSettings.allowableStressPsi, 20000), 1);
  const frictionFactor = Math.max(numeric(globalInputs.frictionFactor, 0.3), 0);
  const warnings = [];

  const processedLines = (Array.isArray(lines) ? lines : []).map((line, inputIndex) => {
    const material = getRackMaterialProps(line.material, line.tOperate);
    const pipe = getRackPipeProps(line.sizeNps, line.schedule);
    warnings.push(...material.warnings.map((message) => ({ lineId: line.id, severity: 'warn', code: 'RACK_MATERIAL_FALLBACK', message })));
    warnings.push(...pipe.warnings.map((message) => ({ lineId: line.id, severity: 'warn', code: 'RACK_PIPE_FALLBACK', message })));

    const deltaIn = expansionLengthFt * material.expansionInPerFt;
    const loopOrder = numeric(pipe.I, 0) * deltaIn;

    // The required absorbing loop leg length from the GC screening equation:
    // L_req² = 3·E·OD·δ / S_allow   [all in consistent units]
    // If δ is in inches and L_req in FEET:
    //   L_req_ft² = 3·E·OD·δ / (S_allow × 144)  where 144 = 12² = in²/ft²
    // Rearranged: L_req_ft = √( 3·E·OD·δ / (144 × S_allow) )
    // Reference: ASME B31.3 Appendix E GC method; L in feet matches field convention.
    const IN2_PER_FT2 = 144; // 12² — converts L² from ft² to in² domain
    const L_req_base_ft = Math.sqrt(
      Math.max(
        (3 * material.modulusPsi * numeric(pipe.OD, 1) * deltaIn) / (IN2_PER_FT2 * allowableStressPsi),
        0
      )
    );

    // In 2D Bundle method (piperack with multiple guided pipes), guide friction
    // reduces effective thermal displacement absorbed by the loop. The effective
    // displacement is reduced, requiring a LONGER loop. Equivalent effect: multiply
    // required length by √(1 + μ) where μ is guide friction factor.
    // Basis: Simplified bundle flexibility approach, Fluor E-3 Engineering Standard.
    // NOTE: Linear (1 + μ) is conservative vs √(1 + μ); retained for conservatism.
    const L_req_ft = (methodology === '2D_BUNDLE' && frictionFactor > 0)
      ? L_req_base_ft * (1 + frictionFactor)  // conservative — Fluor piperack practice
      : L_req_base_ft;

    return {
      ...line,
      inputIndex,
      props: {
        e: material.expansionInPerFt,
        expansionInPer100ft: material.expansionInPer100ft,
        E: material.modulusPsi,
        OD: numeric(pipe.OD, 1),
        I: numeric(pipe.I, 1),
        material: material.material,
        pipeFallback: Boolean(pipe.fallback),
      },
      deltaIn,
      loopOrder,
      L_req_ft,
    };
  }).sort((a, b) => b.loopOrder - a.loopOrder || a.inputIndex - b.inputIndex);

  return {
    lines: processedLines,
    warnings,
    summary: {
      lineCount: processedLines.length,
      anchorDistanceFt,
      expansionLengthFt,
      methodology,
      fallbackCount: warnings.length,
    },
  };
}
