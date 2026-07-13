import {
  validateSolverResultContract,
} from '../core/solvers/certification/solverResultContract.js';
import { createAnalysisContext } from './analysis-context.js';
import { AnalysisCapabilityError } from './analysis-capability-registry.js';
import { EventBus } from './event-bus.js';
import { EVENT_TOPICS } from './event-topics.js';
import { WorkspaceState } from './workspace-state.js';

export class AnalysisCoordinator {
  constructor(eventBus = EventBus, workspaceState = WorkspaceState, registry) {
    if (!registry) throw new TypeError('AnalysisCoordinator requires a capability registry.');
    this.eventBus = eventBus;
    this.workspaceState = workspaceState;
    this.registry = registry;
    this.unsubscribers = [];
    this.requestSequence = 0;
    this.selectionVersion = 0;
    this.destroyed = false;
  }

  init() {
    if (this.unsubscribers.length) return;
    this.destroyed = false;
    this.unsubscribers = [
      this.eventBus.subscribe(
        EVENT_TOPICS.VIEWPORT_ENTITY_SELECTED,
        ({ entityId }) => this.handleSelection(entityId),
      ),
      this.eventBus.subscribe(
        EVENT_TOPICS.ANALYSIS_REQUESTED,
        (payload) => { void this.run(payload); },
      ),
      this.eventBus.subscribe(
        EVENT_TOPICS.DATASET_CLEARED,
        () => this.handleClear(),
      ),
    ];
  }

  handleSelection(entityId) {
    const snapshot = this.workspaceState.getSnapshot();
    if (snapshot.selectedEntityId !== entityId) return;
    this.selectionVersion += 1;
    const context = createAnalysisContext(this.workspaceState, entityId);
    this.eventBus.publish(EVENT_TOPICS.ANALYSIS_CAPABILITIES_CHANGED, {
      targetId: entityId,
      capabilities: this.registry.list(context),
    });
  }

  async run({ analysisType, targetId }) {
    const requestId = `analysis-${++this.requestSequence}`;
    const selectionVersion = this.selectionVersion;
    this.eventBus.publish(EVENT_TOPICS.ANALYSIS_STARTED, {
      requestId,
      analysisType,
      targetId,
    });

    try {
      const snapshot = this.workspaceState.getSnapshot();
      if (snapshot.selectedEntityId !== targetId) {
        throw new AnalysisCapabilityError(
          'STALE_ANALYSIS_TARGET',
          `Analysis target is not the active selection: ${targetId}.`,
        );
      }
      const context = createAnalysisContext(this.workspaceState, targetId);
      const result = await this.registry.execute(analysisType, context);
      if (this.shouldIgnore(selectionVersion, targetId)) return;
      const validation = validateSolverResultContract(result);
      if (!validation.ok) {
        throw new AnalysisCapabilityError(
          'INVALID_SOLVER_RESULT',
          `Analysis result contract is invalid: ${validation.errors.join(' ')}`,
          { errors: validation.errors },
        );
      }
      this.eventBus.publish(EVENT_TOPICS.ANALYSIS_COMPLETED, {
        requestId,
        analysisType,
        targetId,
        result,
      });
    } catch (error) {
      if (this.shouldIgnore(selectionVersion, targetId)) return;
      this.eventBus.publish(EVENT_TOPICS.ANALYSIS_FAILED, {
        requestId,
        analysisType,
        targetId,
        code: String(error?.code || 'ANALYSIS_EXECUTION_FAILED'),
        message: error instanceof Error ? error.message : String(error),
        details: error?.details && typeof error.details === 'object' ? error.details : {},
      });
    }
  }

  shouldIgnore(selectionVersion, targetId) {
    if (this.destroyed || selectionVersion !== this.selectionVersion) return true;
    return this.workspaceState.getSnapshot().selectedEntityId !== targetId;
  }

  handleClear() {
    this.selectionVersion += 1;
    this.eventBus.publish(EVENT_TOPICS.ANALYSIS_CAPABILITIES_CHANGED, {
      targetId: '',
      capabilities: [],
    });
  }

  destroy() {
    this.destroyed = true;
    this.selectionVersion += 1;
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
  }
}
