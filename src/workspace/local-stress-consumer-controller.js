import { calculateLocalStressFoundation } from '../core/local-stress/index.js';

export class LocalStressConsumerController {
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.form = null;
    this.result = null;
    this.submitHandler = (event) => this.handleSubmit(event);
  }

  init() {
    if (!this.rootElement || this.form) return;
    this.rootElement.innerHTML = markup();
    this.form = this.rootElement.querySelector('[data-role="local-stress-form"]');
    this.form?.addEventListener('submit', this.submitHandler);
    this.calculate();
  }

  handleSubmit(event) {
    event.preventDefault();
    this.calculate();
  }

  calculate() {
    try {
      this.result = calculateLocalStressFoundation(readInput(this.form));
      this.renderResult();
      this.setError('');
    } catch (error) {
      this.result = null;
      this.clearResult();
      this.setError(error instanceof Error ? error.message : String(error));
    }
  }

  renderResult() {
    const result = this.result;
    setText(this.rootElement, 'local-stress-status', result.qualification.status);
    setText(this.rootElement, 'local-stress-force', vectorText(result.loadResult.targetForceLocal, 'N'));
    setText(this.rootElement, 'local-stress-moment', vectorText(result.loadResult.targetMomentLocal, 'N·mm'));
    setText(this.rootElement, 'local-stress-inner', stressText(result.pressureResult.inner));
    setText(this.rootElement, 'local-stress-outer', stressText(result.pressureResult.outer));
    setText(this.rootElement, 'local-stress-axial', `${format(result.pressureResult.axialPressureStress)} MPa`);
    setText(this.rootElement, 'local-stress-hash', result.semanticHash);
    const output = this.rootElement.querySelector('[data-role="local-stress-json"]');
    if (output) output.textContent = JSON.stringify(result, null, 2);
  }

  clearResult() {
    ['local-stress-status','local-stress-force','local-stress-moment','local-stress-inner','local-stress-outer','local-stress-axial','local-stress-hash']
      .forEach((role) => setText(this.rootElement, role, '—'));
    const output = this.rootElement?.querySelector('[data-role="local-stress-json"]');
    if (output) output.textContent = '';
  }

  setError(message) {
    const error = this.rootElement?.querySelector('[data-role="local-stress-error"]');
    if (!error) return;
    error.textContent = message;
    error.hidden = !message;
  }

  getResult() { return this.result; }

  destroy() {
    this.form?.removeEventListener('submit', this.submitHandler);
    this.rootElement?.replaceChildren();
    this.form = null;
    this.result = null;
  }
}

function readInput(form) {
  const data = new FormData(form);
  return {
    actionSense: data.get('actionSense'),
    axialDirection: vector(data, 'axis'),
    radialDirection: vector(data, 'radial'),
    sourcePoint: vector(data, 'source'),
    targetPoint: vector(data, 'target'),
    force: vector(data, 'force'),
    moment: vector(data, 'moment'),
    outsideDiameter: data.get('outsideDiameter'),
    nominalThickness: data.get('nominalThickness'),
    corrosionAllowance: data.get('corrosionAllowance'),
    internalPressure: data.get('internalPressure'),
    externalPressure: data.get('externalPressure'),
    endCondition: data.get('endCondition'),
  };
}

function vector(data, prefix) {
  return ['X','Y','Z'].map((axis) => data.get(`${prefix}${axis}`));
}

function setText(root, role, value) {
  const element = root?.querySelector(`[data-role="${role}"]`);
  if (element) element.textContent = value;
}

function vectorText(value, unit) {
  return `[${value.map(format).join(', ')}] ${unit}`;
}

function stressText(value) {
  return `r=${format(value.radius)} mm; σr=${format(value.radialStress)} MPa; σθ=${format(value.hoopStress)} MPa`;
}

function format(value) {
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 8, useGrouping: false });
}

function field(name, label, value, step = 'any') {
  return `<label><span>${label}</span><input name="${name}" type="number" step="${step}" value="${value}" required></label>`;
}

function vectorFields(prefix, label, values) {
  return `<fieldset><legend>${label}</legend><div class="local-stress-vector">
    ${field(`${prefix}X`, 'X', values[0])}${field(`${prefix}Y`, 'Y', values[1])}${field(`${prefix}Z`, 'Z', values[2])}
  </div></fieldset>`;
}

function markup() {
  return `<main class="local-stress-consumer" data-role="local-stress-consumer" aria-label="Local stress foundation">
    ${headerMarkup()}
    <form class="local-stress-form" data-role="local-stress-form">
      ${coordinateMarkup()}
      ${loadMarkup()}
      ${pressureMarkup()}
      <div class="local-stress-actions"><button type="submit">Calculate foundation result</button><output data-role="local-stress-error" hidden></output></div>
    </form>
    ${resultMarkup()}
  </main>`;
}

function headerMarkup() {
  return `<header class="local-stress-consumer__header">
    <div><span class="panel-eyebrow">Independent engineering module</span><h1>Local stress</h1></div>
    <p class="local-stress-consumer__claim">Load transfer and elastic cylindrical pressure baseline only. No local attachment, shell, weld, contact, stability, or code-compliance stress is calculated.</p>
  </header>`;
}

function coordinateMarkup() {
  return `<section class="local-stress-card">
    <h2>Coordinate system and action sense</h2>
    <div class="local-stress-grid">
      <label><span>Action sense</span><select name="actionSense"><option>SUPPORT_ON_PIPE</option><option>PIPE_ON_SUPPORT</option></select></label>
      ${vectorFields('axis', 'Pipe axial direction X', [1,0,0])}
      ${vectorFields('radial', 'Radial outward hint Z', [0,0,1])}
    </div>
  </section>`;
}

function loadMarkup() {
  return `<section class="local-stress-card">
    <h2>Six-component load transfer</h2>
    <p class="local-stress-help">Canonical units: position mm, force N, moment N·mm.</p>
    <div class="local-stress-grid">
      ${vectorFields('source', 'Source point S', [0,0,1000])}
      ${vectorFields('target', 'Target point T', [0,0,0])}
      ${vectorFields('force', 'Force F', [1000,0,0])}
      ${vectorFields('moment', 'Source moment M', [0,0,0])}
    </div>
  </section>`;
}

function pressureMarkup() {
  return `<section class="local-stress-card">
    <h2>Pipe pressure baseline</h2>
    <p class="local-stress-help">Canonical units: geometry mm, pressure/stress MPa.</p>
    <div class="local-stress-grid local-stress-grid--compact">
      ${field('outsideDiameter', 'Outside diameter', 1000)}
      ${field('nominalThickness', 'Nominal pipe thickness', 10)}
      ${field('corrosionAllowance', 'Corrosion allowance', 0)}
      ${field('internalPressure', 'Internal pressure', 2)}
      ${field('externalPressure', 'External pressure', 0)}
      <label><span>Pressure end condition</span><select name="endCondition"><option>CLOSED_END</option><option>OPEN_END</option></select></label>
    </div>
  </section>`;
}

function resultMarkup() {
  return `<section class="local-stress-card" aria-live="polite">
    <h2>Result</h2>
    <dl class="local-stress-summary">
      <div><dt>Status</dt><dd data-role="local-stress-status">—</dd></div>
      <div><dt>Local force [X,Y,Z]</dt><dd data-role="local-stress-force">—</dd></div>
      <div><dt>Local moment [X,Y,Z]</dt><dd data-role="local-stress-moment">—</dd></div>
      <div><dt>Inner wall stress</dt><dd data-role="local-stress-inner">—</dd></div>
      <div><dt>Outer wall stress</dt><dd data-role="local-stress-outer">—</dd></div>
      <div><dt>Axial pressure stress</dt><dd data-role="local-stress-axial">—</dd></div>
      <div><dt>Semantic hash</dt><dd data-role="local-stress-hash">—</dd></div>
    </dl>
    <details><summary>Canonical result evidence</summary><pre data-role="local-stress-json"></pre></details>
  </section>`;
}
