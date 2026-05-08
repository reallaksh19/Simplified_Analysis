import { createSolverResultContract, ENGINEERING_LEVEL } from '../certification/solverResultContract.js';
import { classifySolverTopology, SOLVER_TOPOLOGY_TYPE } from '../routing/classifySolverTopology.js';
import { resolveOletBRLEN } from '../../component-data/resolveComponentDimensions.js';

export const BRANCH_SCREENING_SCHEMA_VERSION = 'branch-screening-v1';

function resolveBranchComponentData(branchDetail, payload) {
  const fittingData = payload.fittingData || {};
  const directData = fittingData[branchDetail.branchSegmentId] || fittingData[branchDetail.branchNodeId];
  if (directData) return null;

  const segments = payload.segments || [];
  const headerSegmentId = branchDetail.mainSegmentIds?.[0];
  const branchSegmentId = branchDetail.branchSegmentId;

  const headerSegment = segments.find(s => s.id === headerSegmentId);
  const branchSegment = segments.find(s => s.id === branchSegmentId);

  if (!headerSegment || !branchSegment) return null;

  const headerDn = headerSegment.properties?.bore ?? headerSegment.properties?.dn;
  const branchDn = branchSegment.properties?.bore ?? branchSegment.properties?.dn;

  if (!isFinite(headerDn) || !isFinite(branchDn)) return null;

  return resolveOletBRLEN({
    dn: headerDn,
    branchDn,
    rating: 300,
    schedule: headerSegment.properties?.schedule || '40',
  });
}

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

    const resolvedComponentData = resolveBranchComponentData(branchDetail, payload);
    const effectiveHasBRLEN = hasBRLEN || (resolvedComponentData && resolvedComponentData.value?.brlen_in);

    return {
      branchNodeId: branchDetail.branchNodeId,
      branchType: branchDetail.branchType,
      mainSegmentIds: branchDetail.mainSegmentIds,
      branchSegmentId: branchDetail.branchSegmentId,
      hasBRLEN: effectiveHasBRLEN,
      status: effectiveHasBRLEN ? 'BRANCH_SCREENING_ONLY' : 'NOT_QUALIFIED_FOR_BRANCH_STRESS',
      componentDataStatus: resolvedComponentData?.status || null,
      componentDataSource: resolvedComponentData?.source || null,
      diagnostics: effectiveHasBRLEN ? [] : [{ severity: 'warn', code: 'BRLEN_REQUIRED', message: 'BRLEN/fitting C2E missing for branch screening.' }],
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
