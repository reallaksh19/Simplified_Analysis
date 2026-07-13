export function renderWorkspaceLayout(rootElement) {
  if (!rootElement) throw new TypeError('Workspace layout requires a root element.');

  rootElement.innerHTML = `
    <main class="workspace-shell" aria-label="Analysis Workspace">
      <aside class="workspace-panel tree-panel" data-panel="tree" aria-label="Dataset tree and layers">
        <header class="panel-header">
          <span class="panel-eyebrow">Analysis Workspace</span>
          <h1>Dataset Tree</h1>
        </header>
        <section class="dataset-toolbar" aria-label="Dataset actions">
          <div class="dataset-toolbar__actions">
            <button type="button" data-action="import-dataset">Import JSON</button>
            <button type="button" data-action="clear-dataset" disabled>Clear</button>
          </div>
          <input data-role="dataset-file" type="file" accept=".json,application/json" hidden>
          <output data-role="tree-status">No dataset loaded</output>
          <p class="dataset-error" data-role="tree-error" hidden></p>
        </section>
        <section class="layer-summary" aria-label="Dataset summary">
          <span data-role="summary-pipes">Pipes 0</span>
          <span data-role="summary-supports">Supports 0</span>
        </section>
        <div class="tree-list" data-role="tree-list">
          <p class="panel-empty">Import a supported workspace JSON package.</p>
        </div>
      </aside>

      <section class="workspace-panel viewport-panel" data-panel="viewport" aria-label="3D viewport">
        <header class="viewport-toolbar">
          <div>
            <span class="panel-eyebrow">Read-only model review</span>
            <h2>Model Viewport</h2>
          </div>
          <div class="viewport-toolbar__status">
            <output data-role="viewport-status">No dataset loaded</output>
            <div class="viewport-toolbar__actions" aria-label="Viewport navigation">
              <button type="button" data-viewport-action="fit">Fit View</button>
              <button type="button" data-viewport-action="reset">Reset View</button>
            </div>
          </div>
        </header>
        <div
          class="viewport-stage"
          data-webgl-host
          data-role="viewport-render-host"
          aria-label="Read-only model viewport"
        ></div>
        <footer class="viewport-footer" data-role="viewport-selection">Selection: none</footer>
      </section>

      <aside class="workspace-panel properties-panel" data-panel="properties" aria-label="Properties and analysis actions">
        <header class="panel-header">
          <span class="panel-eyebrow">Contextual workflow</span>
          <h2>Properties &amp; Actions</h2>
        </header>
        <div class="properties-content" data-role="properties-content">
          <p class="panel-empty">Select a pipe or support to inspect its properties.</p>
        </div>
      </aside>
    </main>
  `;
}
