import assert from 'node:assert/strict';
import { solveContinuumModel } from '../src/core/element-fea/index.js';
import { baseModel, fixedLoadedModel, prescribedFieldModel, squarePatch } from './lfea-001-fixtures.mjs';

const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const qualified = (model) => { const result=solveContinuumModel(model); assert.equal(result.status,'QUALIFIED'); return result; };

const hand = qualified(baseModel());
assert.deepEqual(hand.elementStrains[0].values, [0.01,0.02,0]);
close(hand.elementStresses[0].values[0],1.6); close(hand.elementStresses[0].values[1],2.4);
close(hand.elementInternalForces[0].values[2],0.8); close(hand.strainEnergy,0.016);

const patch = qualified(squarePatch((x,y)=>[0.1+0.02*x+0.03*y,-0.2+0.04*x+0.05*y]));
patch.elementStrains.forEach((row)=>{ close(row.values[0],0.02); close(row.values[1],0.05); close(row.values[2],0.07); });
close(patch.reactionTotals.fx,0); close(patch.reactionTotals.fy,0);

const translation = qualified(prescribedFieldModel(()=>[0.4,-0.3]));
translation.elementStrains[0].values.forEach((value)=>close(value,0));
const rotation = qualified(prescribedFieldModel((x,y)=>[-0.2*y,0.2*x]));
rotation.elementStrains[0].values.forEach((value)=>close(value,0));

const tension = qualified(prescribedFieldModel((x)=>[0.01*x,0]));
close(tension.elementStrains[0].values[0],0.01);
const planeStrainModel = prescribedFieldModel((x,y)=>[0.01*x,0.02*y], { formulation:'PLANE_STRAIN' });
const planeStrain = qualified(planeStrainModel);
assert.notEqual(planeStrain.elementStresses[0].sigmaZ,0);

const shear = qualified(prescribedFieldModel((_x,y)=>[0.02*y,0]));
close(shear.elementStrains[0].values[2],0.02);
const biaxial = qualified(prescribedFieldModel((x,y)=>[0.01*x,0.015*y]));
close(biaxial.elementStrains[0].values[0],0.01); close(biaxial.elementStrains[0].values[1],0.015);

const angle=Math.PI/5, c=Math.cos(angle), s=Math.sin(angle);
const rotated=prescribedFieldModel((x,y)=>[0.01*x,0.02*y], { nodes:[
  {nodeId:'N1',x:0,y:0},{nodeId:'N2',x:c,y:s},{nodeId:'N3',x:-s,y:c},
]});
const rotatedResult=qualified(rotated); close(rotatedResult.elementStrains[0].values[0],0.01); close(rotatedResult.elementStrains[0].values[1],0.02);

assert.equal(hand.nodalDisplacements.find((row)=>row.equationIdentity==='N2:UX').value,0.01);
const traction=qualified(fixedLoadedModel({loadId:'T1',elementId:'E1',edgeNodeIds:['N2','N3'],type:'TRACTION',tx:4,ty:-2}));
const edgeLength=Math.sqrt(2); close(traction.appliedLoadTotals.fx,4*edgeLength); close(traction.appliedLoadTotals.fy,-2*edgeLength);
const pressure=qualified(fixedLoadedModel({loadId:'P1',elementId:'E1',edgeNodeIds:['N2','N3'],type:'PRESSURE',pressure:3}));
close(pressure.appliedLoadTotals.fx,-3); close(pressure.appliedLoadTotals.fy,-3);
close(traction.reactionTotals.fx,-traction.appliedLoadTotals.fx); close(traction.reactionTotals.fy,-traction.appliedLoadTotals.fy);
assert.ok(hand.freeDofResidual.infinityNorm <= 1e-8); assert.ok(hand.globalResidual.infinityNorm <= 1e-8); close(hand.strainEnergy,0.016);
console.log('LFEA-001 formulation, patch, load, reaction, residual and energy fixtures passed.');
