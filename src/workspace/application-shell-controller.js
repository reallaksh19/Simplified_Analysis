const NAV_ITEMS = Object.freeze([
  ['WORKSPACE', 'Workspace'], ['REPORTS', 'Reports'], ['LOAD_CALC', 'Load Calc'],
  ['THREE_D_CALC', '3D Calc'], ['PIPE_SOLVER', 'Pipe Solver'], ['QA', 'QA'], ['DEBUG', 'Debug'],
]);

export class ApplicationShellController {
  #root; #bus; #consumer; #unsubscribers = [];
  constructor(rootElement, eventBus, consumerController) { this.#root = rootElement; this.#bus = eventBus; this.#consumer = consumerController; }
  init() {
    this.#renderNavigation();
    this.#root.querySelector('[data-role="application-navigation"]').addEventListener('click', this.#onClick);
    this.#unsubscribers.push(this.#bus.subscribe('applicationView:changed', () => this.#renderViews()));
    this.#unsubscribers.push(this.#bus.subscribe('workspaceConsumerContext:changed', () => this.#renderViews()));
    this.#renderViews();
  }
  destroy() {
    this.#root.querySelector('[data-role="application-navigation"]')?.removeEventListener('click', this.#onClick);
    this.#unsubscribers.splice(0).forEach((off) => off());
  }
  #onClick = (event) => {
    const button = event.target.closest('[data-consumer-id]');
    if (!button || button.disabled) return;
    this.#bus.publish('applicationView:changeRequested', { viewId: button.dataset.consumerId });
    this.#consumer.activate(button.dataset.consumerId);
  };
  #renderNavigation() {
    const nav = this.#root.querySelector('[data-role="application-navigation"]');
    const active = this.#consumer.getViewState()?.activeViewId ?? 'WORKSPACE';
    nav.innerHTML = NAV_ITEMS.map(([id, label]) => this.#button(id, label, active)).join('');
  }
  #button(id, label, active) {
    const readiness = this.#consumer.getReadiness(id);
    const disabled = readiness.readinessState !== 'AVAILABLE';
    const reason = readiness.readinessState === 'NOT_IMPLEMENTED'
      ? `${label} is not implemented in the current runtime.`
      : disabled ? `${label} is unavailable: ${readiness.readinessState}.` : '';
    const reasonId = `consumer-reason-${id.toLowerCase().replaceAll('_', '-')}`;
    return `<span class="application-navigation__item"><button type="button" role="tab" data-consumer-id="${id}" aria-selected="${active === id}" aria-disabled="${disabled}" aria-describedby="${reasonId}" ${disabled ? 'disabled' : ''}>${label}</button><span id="${reasonId}" class="sr-only">${escapeHtml(reason)}</span></span>`;
  }
  #renderViews() {
    const active = this.#consumer.getViewState()?.activeViewId ?? 'WORKSPACE';
    this.#root.querySelector('[data-application-view="WORKSPACE"]').hidden = active !== 'WORKSPACE';
    this.#root.querySelector('[data-application-view="REPORTS"]').hidden = active !== 'REPORTS';
    this.#renderNavigation();
  }
}
function escapeHtml(value) { return String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]); }