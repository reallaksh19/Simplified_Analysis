import { createSolverResultContract, ENGINEERING_LEVEL } from '../certification/solverResultContract.js';
import { classifySolverTopology, SOLVER_TOPOLOGY_TYPE } from '../routing/classifySolverTopology.js';

export const BRANCH_SCREENING_SCHEMA_VERSION = 'branch-screening-v1';

export function solveBranchScreening(payload = {}) {
  const topology = classifySolverTopology(payload);

  if (topology.topologyType !== SOLVER_TOPOLOGY_TYPE.BRANCH_ROUTE) {
    return createSolverResultContract({
      moduleId: 'branch-screening',
      methodId: 'BRANCH_TOPOLOGY_SCREENING_V1',
      formulaIds: ['BRANCH_TOPOLOGY_CLASSIFICATION'],
      engineeringLevel: ENGINEERING_LEVEL.SCREENING,
      status: 'NOT_QUALIFIED',
      results: { topologyType: topology.topologyType },
      diagnostics: [{ severity: 'error', code: 'NOT_BRANCH_TOPOLOGY', message: `Topology type ${topology.topologyType} is not a branch route.` }],
    });
  }

  const fittingData = payload.fittingData || {};
  const branchChecks = topology.branchDetails.map((branchDetail) => {
    const directData = fittingData[branchDetail.branchSegmentId] || fittingData[branchDetail.branchNodeId];
    const hasBRLEN = directData && (isFinite(Number(directData.BRLEN_in)) || isFinite(Number(directData.BRLEN_mm)));

    return {
      branchNodeId: branchDetail.branchNodeId,
      branchType: branchDetail.branchType,
      mainSegmentIds: branchDetail.mainSegmentIds,
      branchSegmentId: branchDetail.branchSegmentId,
      hasBRLEN,
      status: hasBRLEN ? 'BRANCH_SCREENING_ONLY' : 'NOT_QUALIFIED_FOR_BRANCH_STRESS',
      componentDataStatus: null,
      diagnostics: hasBRLEN ? [] : [{ severity: 'warn', code: 'BRLEN_REQUIRED', message: 'BRLEN/fitting C2E missing for branch screening.' }],
    };
  });

  return createSolverResultContract({
    moduleId: 'branch-screening',
    methodId: 'BRANCH_TOPOLOGY_SCREENING_V1',
    formulaIds: ['BRANCH_TOPOLOGY_CLASSIFICATION', 'TEE_MAIN_BRANCH_VECTOR_COLINEARITY', 'BRLEN_REQUIRED_GATE'],
    engineeringLevel: ENGINEERING_LEVEL.SCREENING,
    status: 'BRANCH_SCREENING_ONLY',
    results: {
      schemaVersion: BRANCH_SCREENING_SCHEMA_VERSION,
      topologyType: topology.topologyType,
      branchDetails: topology.branchDetails,
      branchChecks,
      overallResult: 'BRANCH_SCREENING_ONLY',
      qualification: 'SCREENING_ONLY',
    },
    diagnostics: branchChecks.flatMap(c => c.diagnostics),
    warnings: branchChecks.some(c => !c.hasBRLEN) ? ['BRLEN/fitting C2E data missing for one or more branch connections.'] : [],
  });
}
