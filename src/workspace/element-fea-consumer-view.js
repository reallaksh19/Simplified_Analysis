import { canonicalPrettyStringify } from '../core/shared-piping-model/index.js';

export class ElementFeaConsumerView {
  constructor(rootElement, documentRef = rootElement?.ownerDocument) {
    this.rootElement = rootElement;
    this.documentRef = documentRef;
    this.handlers = null;
  }

  init(handlers) {
    this.handlers = handlers;
    if (!this.rootElement) return;
    this.rootElement.innerHTML = markup();
    this.bind();
  }

  bind() {
    this.button('load-example')?.addEventListener('click', this.handlers.loadExample);
    this.button('run-element-fea')?.addEventListener('click', this.handlers.run);
    this.button('export-element-fea')?.addEventListener('click', this.handlers.exportResult);
    this.button('clear-element-fea')?.addEventListener('click', this.handlers.clear);
  }

  setInput(value) { if (this.input()) this.input().value = canonicalPrettyStringify(value); }
  getInput() { return this.input()?.value || ''; }
  clear() { if (this.input()) this.input().value = ''; this.renderEmpty(); }

  renderResult(result) {
    const output = this.output();
    if (output) output.textContent = canonicalPrettyStringify(result);
    this.setStatus(`${result.status} · ${result.semanticHash}`);
    this.setExportEnabled(result.status === 'QUALIFIED');
  }

  renderError(error) {
    const output = this.output();
    if (output) output.textContent = String(error?.message || error);
    this.setStatus('Input or solve rejected.');
    this.setExportEnabled(false);
  }

  renderEmpty() {
    const output = this.output();
    if (output) output.textContent = 'No result. Load or enter an explicit model, then run Element FEA.';
    this.setStatus('Ready for explicit input.');
    this.setExportEnabled(false);
  }

  setStatus(message) { const row = this.rootElement?.querySelector('[data-role="element-fea-status"]'); if (row) row.textContent = message; }
  setExportEnabled(enabled) { const button = this.button('export-element-fea'); if (button) button.disabled = !enabled; }
  input() { return this.rootElement?.querySelector('[data-role="element-fea-input"]') || null; }
  output() { return this.rootElement?.querySelector('[data-role="element-fea-output"]') || null; }
  button(action) { return this.rootElement?.querySelector(`[data-action="${action}"]`) || null; }

  destroy() {
    this.rootElement?.replaceChildren();
    this.handlers = null;
  }
}

export function downloadElementFeaResult(documentRef, result) {
  const blob = new Blob([canonicalPrettyStringify(result)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = documentRef.createElement('a');
  link.href = url;
  link.download = `${safeName(result.modelIdentity)}-${safeName(result.loadCaseIdentity)}-lfea-result.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function safeName(value) { return String(value || 'element-fea').replace(/[^A-Za-z0-9._-]+/g, '-'); }
function markup() {
  return `<main class="element-fea-consumer" data-role="element-fea-consumer" aria-label="Element FEA">
    <header class="element-fea-consumer__header">
      <div><span class="panel-eyebrow">Independent local continuum analysis</span><h1>Element FEA</h1></div>
      <p class="element-fea-consumer__claim">T3 small-displacement linear elasticity only. No piping-code, commercial-solver parity, or production-scale claim.</p>
    </header>
    <section class="element-fea-card" aria-label="Explicit model input">
      <h2>FEA continuum model</h2>
      <p>Paste a complete <code>fea-continuum-model/v1</code> input. Missing engineering values are rejected; no model values are inferred.</p>
      <div class="element-fea-consumer__controls">
        <button type="button" data-action="load-example">Load Explicit Example</button>
        <button type="button" data-action="run-element-fea">Run Element FEA</button>
        <button type="button" data-action="export-element-fea" disabled>Export Qualified Result</button>
        <button type="button" data-action="clear-element-fea">Clear</button>
        <output data-role="element-fea-status">Ready for explicit input.</output>
      </div>
      <label class="element-fea-editor">Model JSON<textarea data-role="element-fea-input" spellcheck="false" aria-label="Element FEA model JSON"></textarea></label>
    </section>
    <section class="element-fea-card" aria-label="Immutable numerical evidence"><h2>Result evidence</h2><pre data-role="element-fea-output">No result. Load or enter an explicit model, then run Element FEA.</pre></section>
  </main>`;
}
