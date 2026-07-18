export function renderWorkspaceLayout(rootElement) {
  if (!rootElement) throw new TypeError('Workspace layout requires a root element.');
  rootElement.innerHTML = `
    <style data-role="workspace-consumer-styles">${shellStyles()}</style>
    <div class="application-shell" data-role="application-shell">
      <div class="application-navigation" data-role="application-navigation" role="navigation" aria-label="Application views"></div>
      <div class="application-view application-view--workspace" data-application-view="WORKSPACE">
    <main class="workspace-shell" aria-label="Analysis Workspace">
      <aside class="workspace-panel tree-panel" data-panel="tree" aria-label="Dataset tree and layers">
        <header class="panel-header"><span class="panel-eyebrow">Analysis Workspace</span><h1>Dataset Tree</h1></header>
        <section class="dataset-toolbar" aria-label="Dataset actions">
          <div class="dataset-toolbar__actions"><button type="button" data-action="import-dataset">Import JSON</button><button type="button" data-action="clear-dataset" disabled>Clear</button></div>
          <input data-role="dataset-file" type="file" accept=".json,application/json" hidden>
          <output data-role="tree-status">No dataset loaded</output><p class="dataset-error" data-role="tree-error" hidden></p>
        </section>
        <section class="layer-summary" aria-label="Dataset summary"><span data-role="summary-pipes">Pipes 0</span><span data-role="summary-supports">Supports 0</span></section>
        <div class="tree-list" data-role="tree-list"><p class="panel-empty">Import a supported workspace JSON package.</p></div>
      </aside>
      <section class="workspace-panel viewport-panel" data-panel="viewport" aria-label="3D viewport">
        <header class="viewport-toolbar"><div><span class="panel-eyebrow">Read-only model review</span><h2>Model Viewport</h2></div><div class="viewport-toolbar__status"><output data-role="viewport-status">No dataset loaded</output><div class="viewport-toolbar__actions" aria-label="Viewport navigation"><button type="button" data-viewport-action="fit">Fit View</button><button type="button" data-viewport-action="reset">Reset View</button></div></div></header>
        <div class="viewport-stage" data-webgl-host data-role="viewport-render-host" aria-label="Read-only model viewport"></div>
        <footer class="viewport-footer" data-role="viewport-selection">Selection: none</footer>
      </section>
      <aside class="workspace-panel properties-panel" data-panel="properties" aria-label="Properties and analysis actions">
        <header class="panel-header"><span class="panel-eyebrow">Model and contextual workflow</span><h2>Properties &amp; Actions</h2></header>
        <div data-role="shared-model-summary"></div><div data-role="topology-summary"></div><div data-role="support-restraint-summary"></div><div data-role="model-load-summary"></div><div data-role="support-load-screening-summary"></div><div data-role="vertical-beam-summary"></div><div data-role="model-calculation-summary"></div><div data-role="model-support-load-summary"></div>
        <div class="properties-content" data-role="properties-content"><p class="panel-empty">Select an entity to inspect its properties.</p></div>
      </aside>
    </main>
      </div>
      <div class="application-view application-view--reports" data-application-view="REPORTS" hidden aria-hidden="true"><div data-role="reports-consumer-root"></div></div>
      <div class="application-view application-view--load-calc" data-application-view="LOAD_CALC" hidden aria-hidden="true"><div data-role="load-calc-consumer-root"></div></div>
      <div class="application-view application-view--three-d-calc" data-application-view="THREE_D_CALC" hidden aria-hidden="true"><div data-role="three-d-calc-consumer-root"></div></div>
      <div class="application-view application-view--pipe-solver" data-application-view="PIPE_SOLVER" hidden aria-hidden="true"><div data-role="pipe-solver-consumer-root"></div></div>
    </div>`;
}
function shellStyles() {
  return `
    .application-shell{display:grid;grid-template-rows:auto minmax(0,1fr);height:100vh;min-width:0;overflow:hidden;background:var(--workspace-canvas);color:var(--workspace-text)}
    .application-navigation{display:flex;align-items:center;gap:6px;min-width:0;padding:8px 12px;border-bottom:1px solid var(--workspace-border);background:var(--workspace-panel-strong)}
    .application-navigation__item{min-width:0}.application-navigation button{border:1px solid #334155;border-radius:5px;padding:7px 11px;background:#0b1628;color:var(--workspace-text);font-weight:700;white-space:nowrap;cursor:pointer}
    .application-navigation button:hover,.application-navigation button:focus-visible{border-color:var(--workspace-accent);outline:2px solid rgba(96,165,250,.45);outline-offset:2px}
    .application-navigation button[aria-disabled="true"]{color:#94a3b8;cursor:help}.application-navigation__button--active{border-color:#fbbf24!important;background:#1d2433!important;color:#fde68a!important}
    .application-view{min-width:0;min-height:0;overflow:hidden}.application-view[hidden]{display:none!important}.application-view--workspace .workspace-shell{height:100%}
    .application-view--reports,.application-view--load-calc,.application-view--three-d-calc,.application-view--pipe-solver{overflow:auto;background:var(--workspace-canvas)}
    .reports-consumer,.load-calc-consumer,.three-d-calc-consumer,.pipe-solver-consumer{display:grid;gap:14px;max-width:1500px;margin:0 auto;padding:18px;min-width:0}
    .reports-consumer__header,.load-calc-consumer__header,.three-d-calc-consumer__header,.pipe-solver-consumer__header{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}.reports-consumer__header h1,.load-calc-consumer__header h1,.three-d-calc-consumer__header h1,.pipe-solver-consumer__header h1{margin:4px 0 0}
    .reports-consumer__disclaimer,.reports-consumer__footer,.load-calc-consumer__claim,.three-d-calc-consumer__claim,.pipe-solver-consumer__claim{max-width:620px;color:#fbbf24;font-weight:700}.pipe-solver-consumer__claim p{margin:0 0 4px}
    .reports-consumer__controls,.load-calc-consumer__controls,.three-d-calc-consumer__controls,.pipe-solver-consumer__controls{display:flex;flex-wrap:wrap;align-items:end;gap:8px;padding:12px;border:1px solid var(--workspace-border);border-radius:7px;background:var(--workspace-panel)}
    .reports-consumer__controls label{display:grid;gap:5px;min-width:280px;color:var(--workspace-muted);font-size:11px}
    .reports-consumer__controls select,.reports-consumer__controls button,.load-calc-consumer__controls button,.three-d-calc-consumer__controls button,.pipe-solver-consumer__controls button,.pipe-solver-card input,.pipe-solver-card button{border:1px solid #334155;border-radius:5px;padding:8px;background:#0b1628;color:var(--workspace-text)}
    .load-calc-consumer__controls button[aria-disabled="true"],.three-d-calc-consumer__controls button[aria-disabled="true"],.pipe-solver-consumer button[aria-disabled="true"]{color:#94a3b8;cursor:help}.reports-consumer__controls button:focus-visible,.reports-consumer__controls select:focus-visible,.load-calc-consumer__controls button:focus-visible,.three-d-calc-consumer__controls button:focus-visible,.pipe-solver-consumer button:focus-visible,.pipe-solver-consumer input:focus-visible{outline:2px solid rgba(96,165,250,.55);outline-offset:2px}
    .reports-consumer__controls output,.load-calc-consumer__controls output,.three-d-calc-consumer__controls output,.pipe-solver-consumer__controls output{flex-basis:100%;color:#bfdbfe}
    .reports-card,.load-calc-card,.three-d-calc-card,.pipe-solver-card{min-width:0;padding:14px;border:1px solid var(--workspace-border);border-radius:7px;background:var(--workspace-panel)}.reports-card h2,.load-calc-card h2,.three-d-calc-card h2,.pipe-solver-card h2{margin:0 0 10px;font-size:14px}
    .reports-card dl,.load-calc-card dl,.three-d-calc-card dl,.pipe-solver-card dl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0}.reports-card dl div,.load-calc-card dl div,.three-d-calc-card dl div,.pipe-solver-card dl div{min-width:0;padding:8px;background:#060b14}.reports-card dt,.load-calc-card dt,.three-d-calc-card dt,.pipe-solver-card dt{color:var(--workspace-muted);font-size:11px}.reports-card dd,.load-calc-card dd,.three-d-calc-card dd,.pipe-solver-card dd{margin:4px 0 0;overflow-wrap:anywhere;font-weight:700}
    .reports-table-wrap,.load-calc-table-wrap,.three-d-calc-table-wrap,.pipe-solver-table-wrap{max-width:100%;overflow:auto}.reports-card table,.load-calc-card table,.three-d-calc-card table,.pipe-solver-card table{width:100%;border-collapse:collapse;font-size:12px}.reports-card th,.reports-card td,.load-calc-card th,.load-calc-card td,.three-d-calc-card th,.three-d-calc-card td,.pipe-solver-card th,.pipe-solver-card td{padding:8px;border-bottom:1px solid var(--workspace-border);text-align:left;vertical-align:top;overflow-wrap:anywhere}.reports-card th,.load-calc-card th,.three-d-calc-card th,.pipe-solver-card th{color:#bfdbfe;white-space:nowrap}.load-calc-card code,.three-d-calc-card code,.pipe-solver-card code{display:block;white-space:pre-wrap;overflow-wrap:anywhere}
    .pipe-solver-card label{display:grid;gap:5px}.pipe-solver-card input{min-width:130px}
    .visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    @media(max-width:1100px){.application-navigation{flex-wrap:wrap}.reports-card dl,.load-calc-card dl,.three-d-calc-card dl,.pipe-solver-card dl{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:760px){.application-shell{height:auto;min-height:100vh;overflow:visible}.application-view{overflow:visible}.application-view--workspace .workspace-shell{height:auto}.reports-consumer__header,.load-calc-consumer__header,.three-d-calc-consumer__header,.pipe-solver-consumer__header{display:grid}.reports-card dl,.load-calc-card dl,.three-d-calc-card dl,.pipe-solver-card dl{grid-template-columns:minmax(0,1fr)}}`;
}
