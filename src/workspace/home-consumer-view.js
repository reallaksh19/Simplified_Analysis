export class HomeConsumerView {
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.navigate = null;
    this.clickHandler = (event) => this.handleClick(event);
  }

  init(navigate) {
    if (!this.rootElement || this.navigate) return;
    this.navigate = navigate;
    this.rootElement.innerHTML = markup();
    this.rootElement.addEventListener('click', this.clickHandler);
  }

  render(model) {
    if (!this.rootElement || !model) return;
    setText(this.rootElement, '[data-role="home-title"]', model.applicationTitle);
    setText(this.rootElement, '[data-role="home-dataset-status"]', model.dataset.status === 'READY' ? 'Dataset ready' : 'No dataset loaded');
    setText(this.rootElement, '[data-role="home-dataset-id"]', model.dataset.datasetId || 'None');
    setText(this.rootElement, '[data-role="home-count-implemented"]', String(model.counts.implemented));
    setText(this.rootElement, '[data-role="home-count-recovery"]', String(model.counts.recoveryPending));
    setText(this.rootElement, '[data-role="home-count-blocked"]', String(model.counts.blocked));
    setText(this.rootElement, '[data-role="home-count-unimplemented"]', String(model.counts.notImplemented));
    setText(this.rootElement, '[data-role="home-migration-statement"]', model.migrationStatement);
    renderQuickNavigation(this.rootElement.querySelector('[data-role="home-quick-navigation"]'), model.quickNavigation, this.rootElement.ownerDocument);
    renderPending(this.rootElement.querySelector('[data-role="home-pending-tabs"]'), model.pendingTabs, this.rootElement.ownerDocument);
  }

  handleClick(event) {
    const button = event.target.closest('button[data-home-target]');
    if (!button || !this.rootElement?.contains(button)) return;
    this.navigate?.(button.dataset.homeTarget);
  }

  destroy() {
    this.rootElement?.removeEventListener('click', this.clickHandler);
    this.rootElement?.replaceChildren();
    this.navigate = null;
  }
}

function markup() {
  return `<main class="home-consumer" data-role="home-consumer" aria-label="Application Home">
    <header class="home-consumer__header">
      <div><span class="panel-eyebrow">Recovered application shell</span><h1 data-role="home-title"></h1></div>
      <div class="home-consumer__dataset" aria-label="Current dataset status">
        <strong data-role="home-dataset-status"></strong>
        <span>Dataset: <code data-role="home-dataset-id"></code></span>
      </div>
    </header>
    <section class="home-consumer__counts" aria-label="Application tab status counts">
      <article><strong data-role="home-count-implemented">0</strong><span>Implemented</span></article>
      <article><strong data-role="home-count-recovery">0</strong><span>Recovery pending</span></article>
      <article><strong data-role="home-count-blocked">0</strong><span>Blocked</span></article>
      <article><strong data-role="home-count-unimplemented">0</strong><span>Not implemented</span></article>
    </section>
    <section class="home-card" aria-labelledby="home-quick-heading">
      <h2 id="home-quick-heading">Available views</h2>
      <div class="home-consumer__quick-navigation" data-role="home-quick-navigation"></div>
    </section>
    <section class="home-card" aria-labelledby="home-recovery-heading">
      <h2 id="home-recovery-heading">Recovery status</h2>
      <p data-role="home-migration-statement"></p>
      <ul class="home-consumer__pending" data-role="home-pending-tabs"></ul>
    </section>
  </main>`;
}

function renderQuickNavigation(root, rows, document) {
  if (!root) return;
  const nodes = rows.map((row) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.homeTarget = row.consumerId;
    button.textContent = row.label;
    return button;
  });
  root.replaceChildren(...nodes);
}

function renderPending(root, rows, document) {
  if (!root) return;
  const nodes = rows.map((row) => {
    const item = document.createElement('li');
    const label = document.createElement('strong');
    label.textContent = row.label;
    const message = document.createElement('span');
    message.textContent = row.message || 'This view is not available in the current runtime.';
    item.append(label, message);
    return item;
  });
  root.replaceChildren(...nodes);
}

function setText(root, selector, value) {
  const element = root.querySelector(selector);
  if (element) element.textContent = value;
}
