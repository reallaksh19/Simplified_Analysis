export function solveByGeneratingAndAbsorbingLegs({ geometryType, segments, nodes, params, assumptions = [], warnings = [] }) {
  const getPos = (id) => nodes?.[id]?.pos || [0, 0, 0];
  const legData = (segments || []).map((segment) => {
    const start = getPos(segment.start || segment.startNode);
    const end = getPos(segment.end || segment.endNode);
    const length = Number(segment.trueLength) || Math.hypot(end[0] - start[0], end[1] - start[1], end[2] - start[2]);
    return { segmentId: segment.id, length };
  }).filter((leg) => Number.isFinite(leg.length) && leg.length > 0);

  if (legData.length < 2) {
    return { status: 'INVALID', geometryType, stats: { Lreq: 0, Scalc: 0, ratio: 0, genLeg: 0, absLeg: 0, dx: 0 }, warnings: [...warnings, 'At least two valid legs are required for simplified flexibility screening.'], assumptions, formulaTrace: [] };
  }

  const sorted = [...legData].sort((a, b) => b.length - a.length);
  const genLeg = sorted[0].length;
  const absLeg = sorted[1].length;
  const deltaT = Number(params.deltaT) || 0;
  const alpha = Number(params.alpha) || 0;
  const E = Number(params.E) || 0;
  const od = Number(params.od) || 0;
  const Sa = Number(params.Sa) || 0;
  const dx = genLeg * alpha * deltaT;
  const numerator = 3 * E * od * dx;
  const Lreq = Sa > 0 && numerator > 0 ? Math.sqrt(numerator / Sa) : 0;
  const Scalc = absLeg > 0 ? numerator / (absLeg * absLeg) : Infinity;
  const ratio = Sa > 0 && Number.isFinite(Scalc) ? Scalc / Sa : 0;
  const status = ratio === 0 ? 'INVALID' : ratio > 1 ? 'FAIL' : ratio > 0.85 ? 'MARGINAL' : 'PASS';

  return {
    status,
    geometryType,
    stats: { Lreq, Scalc: Number.isFinite(Scalc) ? Scalc : 0, ratio, genLeg, absLeg, dx },
    warnings,
    assumptions: [
      ...assumptions,
      'Simplified screening uses the longest leg as generating leg and the next longest leg as absorbing leg.',
      'This is not a final code stress analysis; use detailed analysis for final engineering decisions.',
    ],
    formulaTrace: [
      { name: 'Thermal displacement', expression: 'dx = Lgen × alpha × deltaT', values: { Lgen: genLeg, alpha, deltaT, dx } },
      { name: 'Required absorbing leg', expression: 'Lreq = sqrt((3 × E × OD × dx) / Sa)', values: { E, od, dx, Sa, Lreq } },
      { name: 'Screening stress', expression: 'Scalc = (3 × E × OD × dx) / Labs²', values: { E, od, dx, Labs: absLeg, Scalc } },
    ],
  };
}
