import { classifySolverTopology, SOLVER_TOPOLOGY_TYPE } from './classifySolverTopology.js';
import { createSolverResultContract, ENGINEERING_LEVEL } from '../certification/solverResultContract.js';

export const SOLVER_ROUTER_SCHEMA_VERSION = 'solver-topology-router-v1';

export async function solveByTopologyRouter(payload = {}, options = {}) {
  const topology = classifySolverTopology(payload);

  const routing = {
    schemaVersion: SOLVER_ROUTER_SCHEMA_VERSION,
    selectedSolver: null,
    topologyType: topology.topologyType,
    route: topology.route,
    canRunGC3D: topology.canRunGC3D,
    canRunBranchScreening: topology.canRunBranchScreening,
  };

  if (topology.topologyType === SOLVER_TOPOLOGY_TYPE.GC3D_SUPPORTED_ROUTE) {
    const gc3dSolver = options.gc3dSolver || (await import('../../solvers/3d/solveGC3D.js').then(m => m.solveGC3D).catch(() => null));
    if (gc3dSolver) {
      routing.selectedSolver = 'GC3D';
      const result = await Promise.resolve(gc3dSolver(payload));
      return { ...result, routing };
    }
  }

  if (topology.topologyType === SOLVER_TOPOLOGY_TYPE.BRANCH_ROUTE) {
    const branchSolver = options.branchSolver || (await import('../branch/solveBranchScreening.js').then(m => m.solveBranchScreening).catch(() => null));
    if (branchSolver) {
      routing.selectedSolver = 'BRANCH_SCREENING';
      const result = await Promise.resolve(branchSolver(payload));
      return { ...result, routing };
    }
  }

  if (topology.topologyType === SOLVER_TOPOLOGY_TYPE.EMPTY) {
    return {
      ...createSolverResultContract({
        moduleId: 'solver-topology-router',
        methodId: 'SOLVER_TOPOLOGY_ROUTER_V1',
        formulaIds: ['TOPOLOGY_ROUTER_GATE'],
        engineeringLevel: ENGINEERING_LEVEL.SCREENING,
        status: 'NOT_QUALIFIED',
        results: { topologyType: topology.topologyType },
        diagnostics: [{ severity: 'warn', code: 'EMPTY_TOPOLOGY', message: 'No nodes or segments to route.' }],
      }),
      routing: { ...routing, selectedSolver: 'NONE' },
    };
  }

  return {
    ...createSolverResultContract({
      moduleId: 'solver-topology-router',
      methodId: 'SOLVER_TOPOLOGY_ROUTER_V1',
      formulaIds: ['TOPOLOGY_ROUTER_GATE'],
      engineeringLevel: ENGINEERING_LEVEL.SCREENING,
      status: 'NOT_QUALIFIED',
      results: { topologyType: topology.topologyType },
      diagnostics: [{ severity: 'error', code: 'UNSUPPORTED_GEOMETRY', message: `Topology type ${topology.topologyType} is not supported by available solvers.` }],
    }),
    routing: { ...routing, selectedSolver: 'UNSUPPORTED' },
  };
}
