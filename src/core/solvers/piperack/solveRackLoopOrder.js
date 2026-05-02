import { getRackMaterialProps, getRackPipeProps, numeric } from './dbUtils.js';

const METHOD_ID = 'PIPERACK_LOOP_ORDER';
const FORMULA_ID = 'PIPERACK_LOOP_REQUIRED_LEG';
const RESULT_STATUSES = {
  PASSED: 'PASSED',
  SCREENING_ONLY: 'SCREENING_ONLY',
  NOT_QUALIFIED: 'NOT_QUALIFIED',
  MISSING_DATA: 'MISSING_DATA'
};

const worstStatus = (statuses = []) => {
  const order = [RESULT_STATUSES.PASSED, RESULT_STATUSES.SCREENING_ONLY, RESULT_STATUSES.NOT_QUALIFIED, RESULT_STATUSES.MISSING_DATA];
  return statuses.reduce((worst, item) => (order.indexOf(item) > order.indexOf(worst) ? item : worst), RESULT_STATUSES.PASSED);
};

const getConstantsSource = (globalSettings = {}, globalInputs = {}) => (
  globalInputs.constantsSource || globalSettings.constantsSource || globalSettings.rackConstantsSource || 'hardcoded-default'
);

function resolveMaterial(line, strictData) {
  return getRackMaterialProps(line.material, line.tOperate, {
    allowFallback: !strictData,
    explicit: {
      expansionInPer100ft: line.expansionInPer100ft ?? line.materialProps?.expansionInPer100ft,
      modulusPsi: line.modulusPsi ?? line.materialProps?.modulusPsi,
      material: line.material
    }
  });
}

function resolvePipe(line, strictData) {
  return getRackPipeProps(line.sizeNps, line.schedule, {
    allowFallback: !strictData,
    explicit: {
      OD: line.OD ?? line.pipeProps?.OD,
      I: line.I ?? line.pipeProps?.I,
      t: line.t ?? line.pipeProps?.t,
      Am: line.Am ?? line.pipeProps?.Am,
      schedule: line.schedule,
      nominal_size: line.sizeNps
    }
  });
}

export function solveRackLoopOrder(lines = [], globalSettings = {}, methodology = 'FLUOR', globalInputs = {}) {
  const anchorDistanceFt = numeric(globalSettings.anchorDistanceFt, 200);
  const expansionLengthFt = numeric(globalSettings.expansionLengthFt, anchorDistanceFt / 2);
  const allowableStressPsi = Math.max(numeric(globalSettings.allowableStressPsi, 20000), 1);
  const frictionFactor = Math.max(numeric(globalInputs.frictionFactor ?? globalSettings.frictionFactor, 0.3), 0);
  const constantsSource = getConstantsSource(globalSettings, globalInputs);
  const strictData = globalSettings.strictData !== false;
  const diagnostics = [];
  const warnings = [];
  const lineStatuses = [];

  if (!Array.isArray(lines) || lines.length === 0) {
    diagnostics.push({ severity: 'ERROR', code: 'NO_RACK_LINES', message: 'No pipe rack lines supplied.' });
    return {
      methodId: METHOD_ID,
      formulaIds: [FORMULA_ID],
      status: RESULT_STATUSES.MISSING_DATA,
      isQualified: false,
      sortedLineIds: [],
      lineResults: [],
      lines: [],
      warnings,
      diagnostics,
      summary: { lineCount: 0, anchorDistanceFt, expansionLengthFt, methodology, fallbackCount: 0 }
    };
  }

  if (constantsSource === 'hardcoded-default') {
    diagnostics.push({ severity: 'WARNING', code: 'RACK_CONSTANTS_HARDCODED', message: 'Rack constants used default values; supply settings/defaults or fixture constantsSource for qualified benchmark status.' });
    lineStatuses.push(RESULT_STATUSES.SCREENING_ONLY);
  }

  const processedLines = lines.map((line, inputIndex) => {
    const material = resolveMaterial(line, strictData);
    const pipe = resolvePipe(line, strictData);
    material.warnings.forEach((message) => diagnostics.push({ lineId: line.id, severity: material.missing ? 'ERROR' : 'WARNING', code: material.missing ? 'RACK_MATERIAL_MISSING' : 'RACK_MATERIAL_WARNING', message }));
    pipe.warnings.forEach((message) => diagnostics.push({ lineId: line.id, severity: pipe.missing ? 'ERROR' : 'WARNING', code: pipe.missing ? 'RACK_PIPE_MISSING' : 'RACK_PIPE_WARNING', message }));

    const status = (material.missing || pipe.missing) ? RESULT_STATUSES.MISSING_DATA : (constantsSource === 'hardcoded-default' ? RESULT_STATUSES.SCREENING_ONLY : RESULT_STATUSES.PASSED);
    lineStatuses.push(status);

    const deltaIn = expansionLengthFt * numeric(material.expansionInPerFt, 0);
    const loopOrder = numeric(pipe.I, 0) * deltaIn;
    const L_req_base_ft = Math.sqrt(Math.max((3 * numeric(material.modulusPsi, 0) * numeric(pipe.OD, 0) * deltaIn) / (144 * allowableStressPsi), 0));
    const L_req_ft = (methodology === '2D_BUNDLE' && frictionFactor > 0) ? L_req_base_ft * (1 + frictionFactor) : L_req_base_ft;

    return {
      ...line,
      inputIndex,
      methodId: METHOD_ID,
      formulaId: FORMULA_ID,
      formulaIds: [FORMULA_ID],
      unitSystem: 'imperial',
      status,
      isQualified: status === RESULT_STATUSES.PASSED,
      props: {
        e: material.expansionInPerFt,
        expansionInPer100ft: material.expansionInPer100ft,
        E: material.modulusPsi,
        OD: numeric(pipe.OD, 0),
        I: numeric(pipe.I, 0),
        material: material.material,
        materialDataSource: material.dataSource,
        pipeDataSource: pipe.dataSource,
        pipeFallback: Boolean(pipe.fallback)
      },
      delta: deltaIn,
      deltaIn,
      loopOrder,
      L_req_ft,
      lineResult: {
        lineId: line.id,
        NPS: line.sizeNps,
        schedule: line.schedule || '40',
        material: material.material,
        delta: deltaIn,
        loopOrder,
        L_req_ft,
        methodId: METHOD_ID,
        formulaId: FORMULA_ID,
        formulaIds: [FORMULA_ID],
        unitSystem: 'imperial',
        status
      }
    };
  }).sort((a, b) => b.loopOrder - a.loopOrder || a.inputIndex - b.inputIndex);

  const status = worstStatus(lineStatuses);
  const sortedLineIds = processedLines.map((line) => line.id);
  return {
    methodId: METHOD_ID,
    formulaIds: [FORMULA_ID],
    status,
    isQualified: status === RESULT_STATUSES.PASSED,
    sortedLineIds,
    lineResults: processedLines.map((line) => line.lineResult),
    lines: processedLines,
    warnings,
    diagnostics,
    summary: {
      lineCount: processedLines.length,
      anchorDistanceFt,
      expansionLengthFt,
      methodology,
      constantsSource,
      fallbackCount: diagnostics.filter((d) => String(d.code || '').includes('FALLBACK')).length,
      maxL_req_ft: Math.max(...processedLines.map((line) => numeric(line.L_req_ft, 0)))
    }
  };
}
