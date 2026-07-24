import assert from 'node:assert/strict';
import { calculateLocalAttachmentScreening } from '../src/core/local-attachment-screening/index.js';
import { mechanicalStress, wallLocation } from '../src/core/local-attachment-screening/mechanics.js';
import { calculateSectionProperties } from '../src/core/local-attachment-screening/section-properties.js';
import { screeningRequestFixture } from './lafea.2-fixtures.mjs';
const request=screeningRequestFixture(),section=calculateSectionProperties(request);
const at=(angle,radius=500)=>wallLocation({evaluationLocationId:'P',radiusBasis:'EXPLICIT_RADIUS',radius,angle,sourceReference:'P'});
const caseOf=(force,moment)=>({combinedForceLocal:force,combinedMomentLocal:moment});
let stress=mechanicalStress(caseOf([1000,0,0],[0,0,0]),at(0),section);close(stress.sigmaXMechanical,1000/section.crossSectionArea);
stress=mechanicalStress(caseOf([0,0,0],[0,20000,0]),at(0),section);close(stress.sigmaXMechanical,20000*500/section.secondMomentY);close(mechanicalStress(caseOf([0,0,0],[0,20000,0]),at(Math.PI),section).sigmaXMechanical,-stress.sigmaXMechanical);close(mechanicalStress(caseOf([0,0,0],[0,20000,0]),at(Math.PI/2),section).sigmaXMechanical,0);
stress=mechanicalStress(caseOf([0,0,0],[0,0,10000]),at(Math.PI/2),section);close(stress.sigmaXMechanical,-10000*500/section.secondMomentZ);close(mechanicalStress(caseOf([0,0,0],[0,0,10000]),at(3*Math.PI/2),section).sigmaXMechanical,-stress.sigmaXMechanical);
for(const radius of [490,495,500])close(mechanicalStress(caseOf([0,0,0],[5000,0,0]),at(0,radius),section).tauXThetaTorsion,5000*radius/section.polarMoment);
const positive=mechanicalStress(caseOf([1000,0,0],[5000,20000,-10000]),at(Math.PI/4),section),negative=mechanicalStress(caseOf([-1000,0,0],[-5000,-20000,10000]),at(Math.PI/4),section);close(negative.sigmaXMechanical,-positive.sigmaXMechanical);close(negative.tauXThetaTorsion,-positive.tauXThetaTorsion);
const result=calculateLocalAttachmentScreening(request);assert.equal(result.qualification.state,'ACCEPTED');assert.ok(result.screeningCases[0].transverseResultantsRetained.forceY!==0);assert.equal('tauXYTransverse' in result.pointStressStates[0].mechanicalStress,false);
console.log('LAFEA.2 axial, biaxial bending, torsion, sign and transverse-resultant behavior passed.');
function close(actual,expected){assert.ok(Math.abs(actual-expected)<=1e-9*Math.max(1,Math.abs(expected)),`${actual} != ${expected}`);}
