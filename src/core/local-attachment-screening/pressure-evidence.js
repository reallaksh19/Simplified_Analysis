import { FORMULA_IDS } from './constants.js';
import { canonicalNumber } from './numeric.js';
export function pressureAtLocation(sourceResult,caseRow,location) {
  const pressure=sourceResult.pressureStressResults.find((row)=>row.pressureDefinitionIdentity===caseRow.pressureDefinitionId);
  const reused=findPoint(pressure.requestedPoints,location.radius);
  const point=reused??recoverPoint(pressure,location.radius);
  const axial=typeof pressure.axialPressureStress==='number'?canonicalNumber(pressure.axialPressureStress*caseRow.pressureFactor):0;
  return {
    pressureDefinitionId:caseRow.pressureDefinitionId, pressureResultIdentity:pressure.identity,
    pressureFactor:caseRow.pressureFactor, radius:location.radius,
    sigmaRPressure:canonicalNumber(point.radialStress*caseRow.pressureFactor),
    sigmaThetaPressure:canonicalNumber(point.hoopStress*caseRow.pressureFactor),
    sigmaXPressure:axial, sourceAxialPressureStress:pressure.axialPressureStress,
    explicitAxialResultant:pressure.explicitAxialResultant,
    endCondition:pressure.endCondition, limitations:pressure.limitations,
    sourceReferences:pressure.sourceReferences,
    reuseMode:reused?'EXACT_POINT':'COEFFICIENT_RADIUS_RECOVERY',
    formulaIds:[reused?FORMULA_IDS.PRESSURE_EXACT:FORMULA_IDS.PRESSURE_RADIUS],
  };
}
function findPoint(points,radius) { return points.find((row)=>row.radius===radius)??null; }
function recoverPoint(pressure,radius) {
  const a=pressure.coefficientA,b=pressure.coefficientB;
  return {radialStress:canonicalNumber(a-b/radius**2),hoopStress:canonicalNumber(a+b/radius**2)};
}
