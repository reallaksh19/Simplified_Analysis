const STYLE_ID = 'w10-8-application-shell-styles';

export class ApplicationShellStyles {
  #document;
  constructor(documentRef) { this.#document = documentRef; }
  init() {
    if (this.#document.getElementById(STYLE_ID)) return;
    const style = this.#document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = cssText();
    this.#document.head.append(style);
  }
  destroy() { this.#document.getElementById(STYLE_ID)?.remove(); }
}

function cssText() {
  return `
    .application-shell { min-width: 0; min-height: 100vh; overflow-x: hidden; background: var(--workspace-canvas); color: var(--workspace-text); }
    .application-navigation { display: flex; align-items: center; gap: 6px; min-height: 48px; padding: 6px 12px; overflow-x: auto; border-bottom: 1px solid var(--workspace-border); background: var(--workspace-panel-strong); }
    .application-navigation__item { flex: 0 0 auto; }
    .application-navigation button { border: 1px solid #334155; border-radius: 5px; padding: 8px 12px; background: #0f172a; color: var(--workspace-text); font: inherit; cursor: pointer; }
    .application-navigation button[aria-selected="true"] { border-color: var(--workspace-accent); background: #172554; color: #dbeafe; }
    .application-navigation button:focus-visible { outline: 2px solid var(--workspace-accent); outline-offset: 2px; }
    .application-navigation button:disabled { opacity: .52; cursor: not-allowed; }
    [data-application-view="WORKSPACE"] .workspace-shell { height: calc(100vh - 48px); }
    .reports-view { min-height: calc(100vh - 48px); padding: 20px; overflow: auto; }
    .reports-consumer { max-width: 1500px; margin: 0 auto; }
    .reports-consumer__toolbar { display: flex; flex-wrap: wrap; align-items: end; gap: 8px; margin: 16px 0; }
    .reports-consumer__toolbar button, .reports-consumer__toolbar select { min-height: 36px; }
    .reports-consumer__identity { display: grid; grid-template-columns: minmax(120px, 220px) minmax(0, 1fr); gap: 8px 16px; }
    .reports-consumer__identity dd { margin: 0; overflow-wrap: anywhere; }
    .reports-table-wrap { max-width: 100%; overflow-x: auto; }
    .reports-consumer table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .reports-consumer th, .reports-consumer td { padding: 8px; border: 1px solid var(--workspace-border); text-align: left; vertical-align: top; }
    .reports-consumer section { margin-block: 20px; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
  `;
}