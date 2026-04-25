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
    const L_req_base_ft = Math.sqrt(Math.max((3 * material.modulusPsi * numeric(pipe.OD, 1) * deltaIn) / (144 * allowableStressPsi), 0));
    const L_req_ft = methodology === '2D_BUNDLE' ? L_req_base_ft * (1 + frictionFactor) : L_req_base_ft;

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
