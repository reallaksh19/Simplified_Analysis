import { reportSchema } from './reportSchema.js';

export class EngineeringReportBuilder {
  constructor(inputSource, calculationMethod) {
    this.report = {
      version: reportSchema.version,
      projectInfo: {},
      inputSource: inputSource,
      geometrySummary: {},
      pipeProperties: {},
      boundaryConditions: {},
      loads: {},
      calculationMethod: calculationMethod,
      results: {},
      warnings: [],
      assumptions: [],
      formulas: [],
      engineeringLimitationNote: 'This calculation is a simplified screening/design-aid calculation. It is not a replacement for formal code-compliant pipe stress analysis.',
      appendix: {}
    };
  }

  setProjectInfo(info) {
    this.report.projectInfo = { ...this.report.projectInfo, ...info };
    return this;
  }

  setGeometrySummary(summary) {
    this.report.geometrySummary = { ...this.report.geometrySummary, ...summary };
    return this;
  }

  setPipeProperties(props) {
    this.report.pipeProperties = { ...this.report.pipeProperties, ...props };
    return this;
  }

  setBoundaryConditions(bcs) {
    this.report.boundaryConditions = { ...this.report.boundaryConditions, ...bcs };
    return this;
  }

  setLoads(loads) {
    this.report.loads = { ...this.report.loads, ...loads };
    return this;
  }

  setResults(results) {
    this.report.results = { ...this.report.results, ...results };
    return this;
  }

  addWarnings(warnings) {
    this.report.warnings = this.report.warnings.concat(warnings);
    return this;
  }

  addAssumptions(assumptions) {
    this.report.assumptions = this.report.assumptions.concat(assumptions);
    return this;
  }

  addFormulas(formulas) {
    this.report.formulas = this.report.formulas.concat(formulas);
    return this;
  }

  setAppendix(geometry) {
    this.report.appendix = geometry;
    return this;
  }

  build() {
    return this.report;
  }
}
