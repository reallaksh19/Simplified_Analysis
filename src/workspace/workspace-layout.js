export function renderWorkspaceLayout(rootElement) {
  if (!rootElement) throw new TypeError('Workspace layout requires a root element.');

  rootElement.innerHTML = `
    <main class="workspace-shell" aria-label="Analysis Workspace">
      <aside class="workspace-panel tree-panel" data-panel="tree" aria-label="Dataset tree and layers">
        <header class="panel-header">
          <span class="panel-eyebrow">Analysis Workspace</span>
          <h1>Dataset Tree</h1>
        </header>
        <section class="layer-summary" aria-label="Visible layers">
          <span>Pipes</span>
          <span>Supports</span>
        </section>
        <div class="tree-list" data-role="tree-list"></div>
      </aside>

      <section class="workspace-panel viewport-panel" data-panel="viewport" aria-label="3D viewport">
        <header class="viewport-toolbar">
          <div>
            <span class="panel-eyebrow">Single-page workflow</span>
            <h2>Model Viewport</h2>
          </div>
          <output data-role="viewport-status">No dataset loaded</output>
        </header>
        <div class="viewport-stage" data-webgl-host aria-label="WebGL canvas mount point">
          <div class="viewport-placeholder">
            <strong>WebGL viewport host</strong>
            <span>Phase 1 intentionally contains no rendering engine.</span>
          </div>
        </div>
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
